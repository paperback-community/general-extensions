import { Form, LabelRow, Section, ToggleRow } from "@paperback/types";

function toBoolean(value: unknown): boolean {
  return (value ?? false) === "true";
}

export function getHQthumb(): boolean {
  return toBoolean(Application.getState("HQthumb"));
}

export function getShowUpcomingChapters(): boolean {
  return toBoolean(Application.getState("prerelease"));
}

export function setHQthumb(value: boolean): void {
  Application.setState(value.toString(), "HQthumb");
}

export function setShowUpcomingChapters(value: boolean): void {
  Application.setState(value.toString(), "prerelease");
}

export class AsuraSettingForm extends Form {
  override getSections(): Application.FormSectionElement[] {
    return [
      Section("Asura Settings", [
        ToggleRow("hq_thumb", {
          title: "HQ Thumbnails",
          value: getHQthumb(),
          onValueChange: Application.Selector(
            this as AsuraSettingForm,
            "hQthumbChange",
          ),
        }),
        LabelRow("label", {
          title: "",
          subtitle:
            "Enabling will show chapters that are only available to Asura+ members. ",
        }),
        ToggleRow("pre", {
          title: "Show Upcoming Chapters",
          value: getShowUpcomingChapters(),
          onValueChange: Application.Selector(
            this as AsuraSettingForm,
            "preChange",
          ),
        }),
        LabelRow("label", {
          title: "",
          subtitle:
            "Enabling HQ thumbnails will use more bandwidth and will load thumbnails slightly slower.",
        }),
      ]),
    ];
  }

  async hQthumbChange(value: boolean): Promise<void> {
    setHQthumb(value);
  }

  async preChange(value: boolean): Promise<void> {
    setShowUpcomingChapters(value);
  }
}
