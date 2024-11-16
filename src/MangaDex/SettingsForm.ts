import {
  ButtonRow,
  DeferredItem,
  Form,
  InputRow,
  LabelRow,
  NavigationRow,
  OAuthButtonRow,
  Request,
  Section,
  SelectRow,
  ToggleRow,
} from "@paperback/types";
import { MDLanguages, MDRatings } from "./MangaDexHelper";
import {
  getAccessToken,
  getDataSaver,
  getForcePort443,
  getLanguages,
  getRatings,
  getSkipSameChapter,
  saveAccessToken,
  setDataSaver,
  setForcePort443,
  setLanguages,
  setRatings,
  setSkipSameChapter,
} from "./MangaDexSettings";

export class SettingsForm extends Form {
  override getSections(): Application.FormSectionElement[] {
    const languages = getLanguages();
    const ratings = getRatings();
    const dataSaver = getDataSaver();
    const skipSameChapter = getSkipSameChapter();
    const forcePort = getForcePort443();

    return [
      Section("playground", [
        NavigationRow("playground", {
          title: "SourceUI Playground",
          form: new SourceUIPlaygroundForm(),
        }),
      ]),

      Section("oAuthSection", [
        DeferredItem(() => {
          if (getAccessToken()) {
            return NavigationRow("sessionInfo", {
              title: "Session Info",
              form: new (class extends Form {
                override getSections(): Application.FormSectionElement[] {
                  const accessToken = getAccessToken();
                  if (!accessToken)
                    return [
                      Section("introspect", [
                        LabelRow("logged_out", {
                          title: "LOGGED OUT",
                        }),
                      ]),
                    ];

                  return [
                    Section(
                      "introspect",
                      Object.keys(accessToken.tokenBody).map((key) => {
                        return LabelRow(key, {
                          title: key,
                          value: `${accessToken.tokenBody[key]}`,
                        });
                      }),
                    ),
                    Section("logout", [
                      ButtonRow("logout", {
                        title: "Logout",
                        // @ts-expect-error
                        onSelect: Application.Selector(this, "logout"),
                      }),
                    ]),
                  ];
                }

                async logout(): Promise<void> {
                  saveAccessToken(undefined, undefined);
                  this.reloadForm();
                }
              })(),
            });
          } else {
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
                this as SettingsForm,
                "oauthDidSucceed",
              ),
            });
          }
        }),
      ]),

      Section("contentSettings", [
        SelectRow("languages", {
          title: "Languages",
          value: languages,
          minItemCount: 1,
          maxItemCount: 100,
          options: MDLanguages.getMDCodeList().map((x) => {
            return { id: x, title: MDLanguages.getName(x) };
          }),
          onValueChange: Application.Selector(
            this as SettingsForm,
            "languageDidChange",
          ),
        }),

        SelectRow("ratings", {
          title: "Content Rating",
          value: ratings,
          minItemCount: 1,
          maxItemCount: 100,
          options: MDRatings.getEnumList().map((x) => {
            return { id: x, title: MDRatings.getName(x) };
          }),
          onValueChange: Application.Selector(
            this as SettingsForm,
            "ratingDidChange",
          ),
        }),

        ToggleRow("data_saver", {
          title: "Data Saver",
          value: dataSaver,
          onValueChange: Application.Selector(
            this as SettingsForm,
            "dataSaverDidChange",
          ),
        }),

        ToggleRow("skip_same_chapter", {
          title: "Skip Same Chapter",
          value: skipSameChapter,
          onValueChange: Application.Selector(
            this as SettingsForm,
            "skipSameChapterDidChange",
          ),
        }),

        ToggleRow("force_port", {
          title: "Force Port 433",
          value: forcePort,
          onValueChange: Application.Selector(
            this as SettingsForm,
            "forcePortDidChange",
          ),
        }),
      ]),
    ];
  }

  async oauthDidSucceed(accessToken: string, refreshToken: string) {
    saveAccessToken(accessToken, refreshToken);
    this.reloadForm();
  }

  async languageDidChange(value: string[]) {
    setLanguages(value);
  }

  async ratingDidChange(value: string[]) {
    setRatings(value);
  }

  async dataSaverDidChange(value: boolean) {
    setDataSaver(value);
  }

  async skipSameChapterDidChange(value: boolean) {
    setSkipSameChapter(value);
  }
  async forcePortDidChange(value: boolean) {
    setForcePort443(value);
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
    value: T,
  ) {
    this._value = value;
  }

  public async updateValue(value: T): Promise<void> {
    console.log("updateValue " + value);
    this._value = value;
    this.form.reloadForm();
  }
}

class SourceUIPlaygroundForm extends Form {
  inputValue = new State(this, "");
  rowsVisible = new State(this, false);
  items: string[] = [];

  override getSections(): Application.FormSectionElement[] {
    return [
      Section("hideStuff", [
        ToggleRow("toggle", {
          title: "Toggles can hide rows",
          value: this.rowsVisible.value,
          onValueChange: this.rowsVisible.selector,
        }),
      ]),

      ...(() =>
        this.rowsVisible.value
          ? [
              Section("hiddenSection", [
                InputRow("input", {
                  title: "Dynamic Input",
                  value: this.inputValue.value,
                  onValueChange: this.inputValue.selector,
                }),

                LabelRow("boundLabel", {
                  title: "Bound label to input",
                  subtitle: "This label updates with the input",
                  value: this.inputValue.value,
                }),
              ]),

              Section("items", [
                ...this.items.map((item) =>
                  LabelRow(item, {
                    title: item,
                  }),
                ),

                ButtonRow("addNewItem", {
                  title: "Add New Item",
                  onSelect: Application.Selector(
                    this as SourceUIPlaygroundForm,
                    "addNewItem",
                  ),
                }),
              ]),
            ]
          : [])(),
    ];
  }

  async addNewItem(): Promise<void> {
    this.items.push("Item " + (this.items.length + 1));
    this.reloadForm();
  }
}
