// TODO: Rework

import {
  ButtonRow,
  Form,
  InputRow,
  LabelRow,
  NavigationRow,
  Section,
  ToggleRow,
} from "@paperback/types";

export class SettingsForm extends Form {
  override getSections(): Application.FormSectionElement[] {
    return [
      Section("playground", [
        NavigationRow("playground", {
          title: "SourceUI Playground",
          form: new SourceUIPlaygroundForm(),
        }),
      ]),
    ];
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
