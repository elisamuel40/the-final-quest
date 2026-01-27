import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { gameEvents } from '../events'
import DialogueSystem, { type DialogueLine } from '../systems/DialogueSystem'
import SoundSystem from '../systems/SoundSystem'

export default class UIScene extends Phaser.Scene {
  private panel!: Phaser.GameObjects.Rectangle
  private text!: Phaser.GameObjects.Text
  private dialogue!: DialogueSystem
  private messageTimer: Phaser.Time.TimerEvent | null = null
  private heartLabel!: Phaser.GameObjects.Text
  private heartBarBack!: Phaser.GameObjects.Rectangle
  private heartBarFill!: Phaser.GameObjects.Rectangle
  private sounds!: SoundSystem

  // Mobile controls
  private isMobile = false
  private mobileControls: {
    up?: Phaser.GameObjects.Rectangle
    down?: Phaser.GameObjects.Rectangle
    left?: Phaser.GameObjects.Rectangle
    right?: Phaser.GameObjects.Rectangle
    action?: Phaser.GameObjects.Rectangle
  } = {}
  public mobileInput = { x: 0, y: 0, action: false }

  constructor() {
    super('UI')
  }

  create() {
    this.sounds = new SoundSystem(this)
    this.detectMobile()
    this.createHeartMeter()

    if (this.isMobile) {
      this.createMobileControls()
    }

    const panelHeight = 68
    this.panel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - panelHeight / 2 - 8, GAME_WIDTH - 24, panelHeight, 0x0f1218, 0.72)
      .setStrokeStyle(2, 0xefe7d7, 0.35)
      .setVisible(false)
    this.text = this.add
      .text(32, GAME_HEIGHT - panelHeight - 4, '', {
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: '14px',
        color: '#f4f1e8',
        wordWrap: { width: GAME_WIDTH - 64 },
        lineSpacing: 6,
      })
      .setVisible(false)

    this.dialogue = new DialogueSystem(this.text)

    this.input.keyboard?.on('keydown-SPACE', () => this.advanceDialogue())
    this.input.keyboard?.on('keydown-ENTER', () => this.advanceDialogue())
    this.input.on('pointerdown', () => this.advanceDialogue())

    gameEvents.on('heart-progress', (value: number) => {
      this.setHeartProgress(value)
      this.sounds.play('heart-progress')
    })

    gameEvents.on('ui-dialogue', (lines: DialogueLine[], onComplete?: () => void) => {
      if (this.dialogue.isActive()) return
      this.showPanel()
      this.sounds.play('message-appear')
      this.dialogue.start(lines, () => {
        this.hidePanel()
        if (onComplete) onComplete()
      })
    })

    gameEvents.on('ui-message', (message: string, duration = 6600) => {
      if (this.dialogue.isActive()) return
      this.showPanel()
      this.text.setText(message)
      this.text.setVisible(true)
      this.sounds.play('message-appear')
      if (this.messageTimer) {
        this.messageTimer.remove(false)
      }
      this.messageTimer = this.time.addEvent({
        delay: duration,
        callback: () => this.hidePanel(),
      })
    })
  }

  private advanceDialogue() {
    if (!this.dialogue.isActive()) return
    this.sounds.play('dialogue-advance')
    this.dialogue.advance()
  }

  private showPanel() {
    this.panel.setVisible(true)
    this.text.setVisible(true)
  }

  private hidePanel() {
    this.panel.setVisible(false)
    this.text.setVisible(false)
  }

  private createHeartMeter() {
    const x = 24
    const y = 18
    const barWidth = 120
    const barHeight = 10
    this.heartLabel = this.add.text(x, y, '<3', {
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: '14px',
      color: '#f5b5c8',
    })
    this.heartLabel.setOrigin(0, 0.5)
    this.heartBarBack = this.add.rectangle(x + 28, y, barWidth, barHeight, 0x1f2433, 0.8)
    this.heartBarBack.setOrigin(0, 0.5).setStrokeStyle(1, 0xf5b5c8, 0.6)
    this.heartBarFill = this.add.rectangle(x + 28, y, 0, barHeight - 2, 0xf5b5c8, 0.9)
    this.heartBarFill.setOrigin(0, 0.5)
    this.setHeartProgress(0)
  }

  private detectMobile() {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || (window.innerWidth < 768)
  }

  private createMobileControls() {
    const buttonSize = 50
    const padding = 20
    const opacity = 0.6
    const buttonColor = 0x2d3436
    const buttonStroke = 0xf4f1e8

    // D-pad position (bottom left)
    const dpadX = padding + buttonSize
    const dpadY = GAME_HEIGHT - padding - buttonSize - 60

    // Up button
    this.mobileControls.up = this.add.rectangle(dpadX, dpadY - buttonSize - 10, buttonSize, buttonSize, buttonColor, opacity)
    this.mobileControls.up.setStrokeStyle(2, buttonStroke, 0.8)
    this.mobileControls.up.setInteractive()
    this.mobileControls.up.setScrollFactor(0)
    this.add.text(dpadX, dpadY - buttonSize - 10, '▲', { fontSize: '24px', color: '#f4f1e8' })
      .setOrigin(0.5)
      .setScrollFactor(0)

    // Down button
    this.mobileControls.down = this.add.rectangle(dpadX, dpadY + buttonSize + 10, buttonSize, buttonSize, buttonColor, opacity)
    this.mobileControls.down.setStrokeStyle(2, buttonStroke, 0.8)
    this.mobileControls.down.setInteractive()
    this.mobileControls.down.setScrollFactor(0)
    this.add.text(dpadX, dpadY + buttonSize + 10, '▼', { fontSize: '24px', color: '#f4f1e8' })
      .setOrigin(0.5)
      .setScrollFactor(0)

    // Left button
    this.mobileControls.left = this.add.rectangle(dpadX - buttonSize - 10, dpadY, buttonSize, buttonSize, buttonColor, opacity)
    this.mobileControls.left.setStrokeStyle(2, buttonStroke, 0.8)
    this.mobileControls.left.setInteractive()
    this.mobileControls.left.setScrollFactor(0)
    this.add.text(dpadX - buttonSize - 10, dpadY, '◀', { fontSize: '24px', color: '#f4f1e8' })
      .setOrigin(0.5)
      .setScrollFactor(0)

    // Right button
    this.mobileControls.right = this.add.rectangle(dpadX + buttonSize + 10, dpadY, buttonSize, buttonSize, buttonColor, opacity)
    this.mobileControls.right.setStrokeStyle(2, buttonStroke, 0.8)
    this.mobileControls.right.setInteractive()
    this.mobileControls.right.setScrollFactor(0)
    this.add.text(dpadX + buttonSize + 10, dpadY, '▶', { fontSize: '24px', color: '#f4f1e8' })
      .setOrigin(0.5)
      .setScrollFactor(0)

    // Action button (bottom right) - for E key
    const actionX = GAME_WIDTH - padding - buttonSize
    const actionY = GAME_HEIGHT - padding - buttonSize
    this.mobileControls.action = this.add.rectangle(actionX, actionY, buttonSize + 10, buttonSize + 10, 0x6fb1a3, opacity)
    this.mobileControls.action.setStrokeStyle(2, buttonStroke, 0.9)
    this.mobileControls.action.setInteractive()
    this.mobileControls.action.setScrollFactor(0)
    this.add.text(actionX, actionY, 'E', { fontSize: '28px', color: '#f4f1e8', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0)

    // Set up touch handlers
    this.setupTouchHandlers()
  }

  private setupTouchHandlers() {
    // Reset input each frame
    this.mobileInput = { x: 0, y: 0, action: false }

    // Up
    this.mobileControls.up?.on('pointerdown', () => {
      this.mobileInput.y = -1
      this.mobileControls.up?.setFillStyle(0x3498db, 0.8)
    })
    this.mobileControls.up?.on('pointerup', () => {
      this.mobileInput.y = 0
      this.mobileControls.up?.setFillStyle(0x2d3436, 0.6)
    })
    this.mobileControls.up?.on('pointerout', () => {
      this.mobileInput.y = 0
      this.mobileControls.up?.setFillStyle(0x2d3436, 0.6)
    })

    // Down
    this.mobileControls.down?.on('pointerdown', () => {
      this.mobileInput.y = 1
      this.mobileControls.down?.setFillStyle(0x3498db, 0.8)
    })
    this.mobileControls.down?.on('pointerup', () => {
      this.mobileInput.y = 0
      this.mobileControls.down?.setFillStyle(0x2d3436, 0.6)
    })
    this.mobileControls.down?.on('pointerout', () => {
      this.mobileInput.y = 0
      this.mobileControls.down?.setFillStyle(0x2d3436, 0.6)
    })

    // Left
    this.mobileControls.left?.on('pointerdown', () => {
      this.mobileInput.x = -1
      this.mobileControls.left?.setFillStyle(0x3498db, 0.8)
    })
    this.mobileControls.left?.on('pointerup', () => {
      this.mobileInput.x = 0
      this.mobileControls.left?.setFillStyle(0x2d3436, 0.6)
    })
    this.mobileControls.left?.on('pointerout', () => {
      this.mobileInput.x = 0
      this.mobileControls.left?.setFillStyle(0x2d3436, 0.6)
    })

    // Right
    this.mobileControls.right?.on('pointerdown', () => {
      this.mobileInput.x = 1
      this.mobileControls.right?.setFillStyle(0x3498db, 0.8)
    })
    this.mobileControls.right?.on('pointerup', () => {
      this.mobileInput.x = 0
      this.mobileControls.right?.setFillStyle(0x2d3436, 0.6)
    })
    this.mobileControls.right?.on('pointerout', () => {
      this.mobileInput.x = 0
      this.mobileControls.right?.setFillStyle(0x2d3436, 0.6)
    })

    // Action button (E key)
    this.mobileControls.action?.on('pointerdown', () => {
      this.mobileInput.action = true
      this.mobileControls.action?.setFillStyle(0x3498db, 0.9)
      gameEvents.emit('mobile-action-pressed')
    })
    this.mobileControls.action?.on('pointerup', () => {
      this.mobileInput.action = false
      this.mobileControls.action?.setFillStyle(0x6fb1a3, 0.6)
    })
    this.mobileControls.action?.on('pointerout', () => {
      this.mobileInput.action = false
      this.mobileControls.action?.setFillStyle(0x6fb1a3, 0.6)
    })
  }

  private setHeartProgress(value: number) {
    const clamped = Phaser.Math.Clamp(value, 0, 1)
    const fullWidth = this.heartBarBack.width
    this.heartBarFill.width = Math.max(2, fullWidth * clamped)
  }
}
