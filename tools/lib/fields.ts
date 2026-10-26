/** A value of decoded TOML or JSON read field by field, for the few keys of a file no schema covers. */
export class Fields {
  public constructor(public readonly value: unknown) {}

  /** The field `key`, or an empty value when this is no object or lacks it. */
  public at(key: string): Fields {
    return new Fields(
      typeof this.value === 'object' && this.value !== null
        ? (Reflect.get(this.value, key) as unknown)
        : undefined,
    );
  }

  /** The value as text, or `undefined` when it is missing or not a string. */
  public text(): string | undefined {
    return typeof this.value === 'string' ? this.value : undefined;
  }
}
