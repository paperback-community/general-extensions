import {
  ButtonRow,
  DeferredItem,
  Form,
  LabelRow,
  NavigationRow,
  OAuthButtonRow,
  Section,
  SelectRow,
  ToggleRow,
} from "@paperback/types";
import { MDImageQuality, MDLanguages, MDRatings } from "./MangaDexHelper";

export function getLanguages(): string[] {
  return (
    (Application.getState("languages") as string[] | undefined) ??
    MDLanguages.getDefault()
  );
}

export function getRatings(): string[] {
  return (
    (Application.getState("ratings") as string[] | undefined) ??
    MDRatings.getDefault()
  );
}

export function getDataSaver(): boolean {
  return (Application.getState("data_saver") as boolean | undefined) ?? false;
}

export function getSkipSameChapter(): boolean {
  return (
    (Application.getState("skip_same_chapter") as boolean | undefined) ?? false
  );
}

export function getForcePort443(): boolean {
  return (
    (Application.getState("force_port_443") as boolean | undefined) ?? false
  );
}

export function getHomepageThumbnail(): string {
  return (
    (Application.getState("homepage_thumbnail") as string | undefined) ??
    MDImageQuality.getDefault("homepage")
  );
}

export function getSearchThumbnail(): string {
  return (
    (Application.getState("search_thumbnail") as string | undefined) ??
    MDImageQuality.getDefault("search")
  );
}

export function getMangaThumbnail(): string {
  return (
    (Application.getState("manga_thumbnail") as string | undefined) ??
    MDImageQuality.getDefault("manga")
  );
}

export function getAccessToken(): MangaDex.AccessToken | undefined {
  const accessToken = Application.getSecureState("access_token") as
    | string
    | undefined;
  const refreshToken = Application.getSecureState("refresh_token") as
    | string
    | undefined;

  if (!accessToken) return undefined;

  return {
    accessToken,
    refreshToken,
    tokenBody: parseAccessToken(accessToken),
  };
}

export function saveAccessToken(
  accessToken: string | undefined,
  refreshToken: string | undefined,
): MangaDex.AccessToken | undefined {
  Application.setSecureState(accessToken, "access_token");
  Application.setSecureState(refreshToken, "refresh_token");

  if (!accessToken) return undefined;

  return {
    accessToken,
    refreshToken,
    tokenBody: parseAccessToken(accessToken),
  };
}

function parseAccessToken(accessToken: string): MangaDex.TokenBody {
  const tokenBodyBase64 = accessToken.split(".")[1];
  if (!tokenBodyBase64) throw new Error("Invalid access token format");

  const tokenBodyJSON = Buffer.from(tokenBodyBase64, "base64").toString(
    "ascii",
  );
  return JSON.parse(tokenBodyJSON) as MangaDex.TokenBody;
}

async function _authEndpointRequest(
  endpoint: "login" | "refresh" | "logout",
  payload: string | undefined,
): Promise<MangaDex.AuthResponse | MangaDex.AuthError> {
  const [response, buffer] = await Application.scheduleRequest({
    method: "POST",
    url: `https://auth.mangadex.org/auth/${endpoint}`,
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

  if (response.status > 399) {
    throw new Error(`Request failed with status code: ${response.status}`);
  }

  const data = Application.arrayBufferToUTF8String(buffer);
  const jsonData = JSON.parse(data) as
    | MangaDex.AuthResponse
    | MangaDex.AuthError;

  if (jsonData.result === "error") {
    throw new Error(
      "Auth failed: " +
        (jsonData as MangaDex.AuthError).errors
          .map((x) => `[${x.title}]: ${x.detail}`)
          .join(", "),
    );
  }

  return jsonData;
}

const authRequestCache: Record<
  string,
  Promise<MangaDex.AuthResponse | MangaDex.AuthError>
> = {};

export function authEndpointRequest(
  endpoint: "login" | "refresh" | "logout",
  payload: string | undefined,
): Promise<MangaDex.AuthResponse> {
  if (!(endpoint in authRequestCache)) {
    authRequestCache[endpoint] = _authEndpointRequest(
      endpoint,
      payload,
    ).finally(() => {
      delete authRequestCache[endpoint];
    });
  }
  return authRequestCache[endpoint] as Promise<MangaDex.AuthResponse>;
}

export class MangaDexSettingsForm extends Form {
  // State management for all form fields
  private languagesState = new State<string[]>(
    this,
    "languages",
    getLanguages(),
  );
  private ratingsState = new State<string[]>(this, "ratings", getRatings());
  private dataSaverState = new State<boolean>(
    this,
    "data_saver",
    getDataSaver(),
  );
  private skipSameChapterState = new State<boolean>(
    this,
    "skip_same_chapter",
    getSkipSameChapter(),
  );
  private forcePortState = new State<boolean>(
    this,
    "force_port_443",
    getForcePort443(),
  );
  private oAuthState = new State<boolean>(
    this,
    "oauth_state",
    !!getAccessToken(),
  );

  // Add thumbnail states
  private homepageThumbState = new State<string>(
    this,
    "homepage_thumbnail",
    getHomepageThumbnail(),
  );
  private searchThumbState = new State<string>(
    this,
    "search_thumbnail",
    getSearchThumbnail(),
  );
  private mangaThumbState = new State<string>(
    this,
    "manga_thumbnail",
    getMangaThumbnail(),
  );

  // Add reset state
  private resetState = new State<boolean>(this, "reset_trigger", false);

  override getSections(): Application.FormSectionElement[] {
    return [
      this.createOAuthSection(),
      this.createContentSettingsSection(),
      this.createThumbnailSettingsSection(),
      this.createResetSection(),
    ];
  }

  private createOAuthSection(): Application.FormSectionElement {
    return Section("oAuthSection", [
      DeferredItem(() => {
        if (this.oAuthState.value) {
          return NavigationRow("sessionInfo", {
            title: "Session Info",
            form: this.createSessionInfoForm(),
          }) as Application.FormItemElement<unknown>;
        }
        return this.createLoginButton();
      }),
    ]);
  }

  private createSessionInfoForm(): Form {
    return new (class SessionInfoForm extends Form {
      parentForm: MangaDexSettingsForm;
      private sessionState: boolean;

      constructor(private outerForm: MangaDexSettingsForm) {
        super();
        this.parentForm = outerForm;
        this.sessionState = outerForm.oAuthState.value;
      }

      override getSections(): Application.FormSectionElement[] {
        // Use the captured session state instead of direct access token check
        if (!this.sessionState) {
          return [
            Section("session_status", [
              LabelRow("status", {
                title: "Status",
                value: "Successfully logged out",
              }),
            ]),
          ];
        }

        const accessToken = getAccessToken();
        if (!accessToken) {
          return [
            Section("introspect", [
              LabelRow("logged_out", { title: "LOGGED OUT" }),
            ]),
          ];
        }

        return [
          Section(
            "introspect",
            Object.entries(accessToken.tokenBody).map(([key, value]) =>
              LabelRow(key, {
                title: key,
                value: String(value),
              }),
            ),
          ),
          Section("account_actions", [
            ButtonRow("refresh_token_button", {
              title: "Refresh Token",
              onSelect: Application.Selector(
                this as SessionInfoForm,
                "handleRefreshToken",
              ),
            }),
            ButtonRow("logout", {
              title: "Logout",
              onSelect: Application.Selector(
                this as SessionInfoForm,
                "handleLogout",
              ),
            }),
          ]),
        ];
      }

      async handleRefreshToken(): Promise<void> {
        const response = await authEndpointRequest(
          "refresh",
          getAccessToken()?.refreshToken,
        );
        saveAccessToken(response.token.session, response.token.refresh);
        await this.parentForm.oAuthState.updateValue(true);
        this.sessionState = true;
        this.reloadForm();
      }

      async handleLogout(): Promise<void> {
        saveAccessToken(undefined, undefined);
        await this.parentForm.oAuthState.updateValue(false);
        this.sessionState = false;
        this.reloadForm();
      }
    })(this);
  }

  private createLoginButton(): Application.FormItemElement<unknown> {
    return OAuthButtonRow("oAuthButton", {
      title: "Login with MangaDex",
      authorizeEndpoint:
        "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/auth",
      clientId: "paperback",
      redirectUri: "paperback://mangadex-login",
      responseType: {
        type: "pkce",
        pkceCodeLength: 64,
        pkceCodeMethod: "S256",
        formEncodeGrant: true,
        tokenEndpoint:
          "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token",
      },
      onSuccess: Application.Selector(
        this as MangaDexSettingsForm,
        "handleOAuthSuccess",
      ),
    });
  }

  private createContentSettingsSection(): Application.FormSectionElement {
    return Section("contentSettings", [
      SelectRow("languages", {
        title: "Languages",
        value: this.languagesState.value,
        minItemCount: 1,
        maxItemCount: 100,
        options: MDLanguages.getMDCodeList().map((x) => ({
          id: x,
          title: MDLanguages.getName(x),
        })),
        onValueChange: this.languagesState.selector,
      }),

      SelectRow("ratings", {
        title: "Content Rating",
        value: this.ratingsState.value,
        minItemCount: 1,
        maxItemCount: 4,
        options: MDRatings.getEnumList().map((x) => ({
          id: x,
          title: MDRatings.getName(x),
        })),
        onValueChange: this.ratingsState.selector,
      }),

      ToggleRow("data_saver", {
        title: "Data Saver",
        value: this.dataSaverState.value,
        onValueChange: this.dataSaverState.selector,
      }),

      ToggleRow("skip_same_chapter", {
        title: "Skip Same Chapter",
        value: this.skipSameChapterState.value,
        onValueChange: this.skipSameChapterState.selector,
      }),

      ToggleRow("force_port", {
        title: "Force Port 443",
        value: this.forcePortState.value,
        onValueChange: this.forcePortState.selector,
      }),
    ]);
  }

  private createThumbnailSettingsSection(): Application.FormSectionElement {
    return Section("thumbnail_settings", [
      SelectRow("homepage_thumbnail", {
        title: "Homepage Thumbnail Quality",
        value: [this.homepageThumbState.value],
        minItemCount: 1,
        maxItemCount: 1,
        options: MDImageQuality.getEnumList().map((x) => ({
          id: x,
          title: MDImageQuality.getName(x),
        })),
        onValueChange: Application.Selector(
          this as MangaDexSettingsForm,
          "handleHomepageThumbChange",
        ),
      }),

      SelectRow("search_thumbnail", {
        title: "Search Thumbnail Quality",
        value: [this.searchThumbState.value],
        minItemCount: 1,
        maxItemCount: 1,
        options: MDImageQuality.getEnumList().map((x) => ({
          id: x,
          title: MDImageQuality.getName(x),
        })),
        onValueChange: Application.Selector(
          this as MangaDexSettingsForm,
          "handleSearchThumbChange",
        ),
      }),

      SelectRow("manga_thumbnail", {
        title: "Manga Thumbnail Quality",
        value: [this.mangaThumbState.value],
        minItemCount: 1,
        maxItemCount: 1,
        options: MDImageQuality.getEnumList().map((x) => ({
          id: x,
          title: MDImageQuality.getName(x),
        })),
        onValueChange: Application.Selector(
          this as MangaDexSettingsForm,
          "handleMangaThumbChange",
        ),
      }),
    ]);
  }

  private createResetSection(): Application.FormSectionElement {
    return Section("reset_section", [
      ButtonRow("reset_settings", {
        title: "Reset to Defaults",
        onSelect: Application.Selector(
          this as MangaDexSettingsForm,
          "handleResetSettings",
        ),
      }),
    ]);
  }

  async handleHomepageThumbChange(value: string[]): Promise<void> {
    await this.homepageThumbState.updateValue(value[0]);
  }

  async handleSearchThumbChange(value: string[]): Promise<void> {
    await this.searchThumbState.updateValue(value[0]);
  }

  async handleMangaThumbChange(value: string[]): Promise<void> {
    await this.mangaThumbState.updateValue(value[0]);
  }

  async handleOAuthSuccess(
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    saveAccessToken(accessToken, refreshToken);
    await this.oAuthState.updateValue(true);
    this.reloadForm();
  }

  async handleResetSettings(): Promise<void> {
    // Clear all settings through state instances
    await Promise.all([
      this.languagesState.updateValue(MDLanguages.getDefault()),
      this.ratingsState.updateValue(MDRatings.getDefault()),
      this.dataSaverState.updateValue(false),
      this.skipSameChapterState.updateValue(false),
      this.homepageThumbState.updateValue(
        MDImageQuality.getDefault("homepage"),
      ),
      this.searchThumbState.updateValue(MDImageQuality.getDefault("search")),
      this.mangaThumbState.updateValue(MDImageQuality.getDefault("manga")),
      this.forcePortState.updateValue(false),
    ]);

    // Trigger UI update
    await this.resetState.updateValue(!this.resetState.value);
  }
}

class State<T> {
  private _value: T;
  public get value(): T {
    return this._value;
  }

  public get selector(): SelectorID<(value: T) => Promise<void>> {
    return Application.Selector(this as State<T>, "updateValue");
  }

  constructor(
    private form: Form,
    private persistKey: string,
    value: T,
  ) {
    this._value = value;
  }

  public async updateValue(value: T): Promise<void> {
    this._value = value;

    Application.setState(value, this.persistKey);

    this.form.reloadForm();
  }
}
