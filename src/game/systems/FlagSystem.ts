export type Flags = Record<string, boolean>

export default class FlagSystem {
  private readonly flags: Flags

  constructor(initialFlags: Flags) {
    this.flags = { ...initialFlags }
  }

  get(key: string) {
    return Boolean(this.flags[key])
  }

  set(key: string, value = true) {
    this.flags[key] = value
  }

  all() {
    return { ...this.flags }
  }
}
