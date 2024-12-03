import { Form } from "@paperback/types";

// Usage:
// const [test, setTest, selectorTest] = createFormState(this, 0)
class FormState<T> {
  private _value: T;
  private _selector: SelectorID<(value: T) => Promise<void>>;

  constructor(
    private form: Form,
    initialValue: T,
  ) {
    this._value = initialValue;
    this._selector = Application.Selector(this as FormState<T>, "updateValue");
  }

  public get value(): T {
    return this._value;
  }

  public get selector(): SelectorID<(value: T) => Promise<void>> {
    return this._selector;
  }

  public async updateValue(value: T): Promise<void> {
    this._value = value;
    this.form.reloadForm();
  }
}

function createFormState<T>(
  form: Form,
  initialValue: T,
): [
  () => T,
  (value: T) => Promise<void>,
  SelectorID<(value: T) => Promise<void>>,
] {
  const state = new FormState(form, initialValue);
  return [() => state.value, state.updateValue.bind(state), state.selector];
}

function getState<T>(key: string, defaultValue: T): T {
  return (Application.getState(key) as T | undefined) ?? defaultValue;
}

export { createFormState, getState };
