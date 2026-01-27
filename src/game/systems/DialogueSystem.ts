import type Phaser from 'phaser'

export type DialogueLine = {
  speaker?: string
  text?: string
  action?: string
}

export default class DialogueSystem {
  private readonly textObject: Phaser.GameObjects.Text
  private lines: DialogueLine[] = []
  private index = 0
  private active = false
  private onComplete: (() => void) | null = null

  constructor(textObject: Phaser.GameObjects.Text) {
    this.textObject = textObject
  }

  start(lines: DialogueLine[], onComplete?: () => void) {
    this.lines = lines
    this.index = 0
    this.active = true
    this.onComplete = onComplete ?? null
    this.renderCurrentLine()
  }

  advance() {
    if (!this.active) return
    this.index += 1
    if (this.index >= this.lines.length) {
      this.active = false
      this.textObject.setVisible(false)
      const callback = this.onComplete
      this.onComplete = null
      if (callback) callback()
      return
    }
    this.renderCurrentLine()
  }

  isActive() {
    return this.active
  }

  private renderCurrentLine() {
    const line = this.lines[this.index]
    if (!line) return
    let output = ''
    if (line.speaker) {
      output += `${line.speaker}: `
    }
    if (line.text) {
      output += line.text
    } else if (line.action) {
      output += `(${line.action})`
    }
    this.textObject.setText(output)
    this.textObject.setVisible(true)
  }
}
