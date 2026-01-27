import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { gameEvents } from '../events'
import { type DialogueLine } from '../systems/DialogueSystem'
import FlagSystem from '../systems/FlagSystem'
import PartyFollowSystem, { type FollowEntry } from '../systems/PartyFollowSystem'
import SoundSystem from '../systems/SoundSystem'
import dialogueData from '../data/dialogue.json'
import flagsData from '../data/flags.json'

type DialogueData = {
  prologue: DialogueLine[]
  prologueHint: string
  prologueInstruction: string
  moveInTogether: DialogueLine[]
  moveInHint: string
  homeBuildHint: string
  homeBuildComplete: string
  homeBuildEnter: string
  megabyteJoinHint: string
  megabyteWelcome: string
  healthHint: string
  healthComplete: string
  crossroadHint: string
  crossroadFarewell: string
  togetherForwardHint: string
  lastTileInstruction: string
  finalMissingHint: string
  proposal: DialogueLine[]
}

type StageState = {
  triggered?: boolean
  completed?: boolean
}

export default class WorldScene extends Phaser.Scene {
  private static readonly MAX_STAGE_INDEX = 9
  private readonly dialogue = dialogueData as DialogueData
  private flags!: FlagSystem
  private followSystem!: PartyFollowSystem
  private sounds!: SoundSystem
  private player!: Phaser.Physics.Arcade.Sprite
  private bianca!: Phaser.Physics.Arcade.Sprite
  private megabyte!: Phaser.Physics.Arcade.Sprite
  private kira!: Phaser.Physics.Arcade.Sprite

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private keys?: {
    w: Phaser.Input.Keyboard.Key
    a: Phaser.Input.Keyboard.Key
    s: Phaser.Input.Keyboard.Key
    d: Phaser.Input.Keyboard.Key
    e: Phaser.Input.Keyboard.Key
    n: Phaser.Input.Keyboard.Key
  }

  private stageIndex = 0
  private stageObjects: Phaser.GameObjects.GameObject[] = []
  private stageColliders: Phaser.Physics.Arcade.Collider[] = []
  private stageState: StageState = {}
  private stageTimer: Phaser.Time.TimerEvent | null = null

  private biancaFollow!: FollowEntry
  private megabyteFollow!: FollowEntry
  private megabyteSitting = false
  private controlsEnabled = true
  private controlledSprite?: Phaser.Physics.Arcade.Sprite
  private lastLogged?: { sprite: Phaser.Physics.Arcade.Sprite; x: number; y: number }

  private boxes: Phaser.Physics.Arcade.Sprite[] = []
  private moveInZone: Phaser.Geom.Rectangle | null = null
  private lastFootstepTime = 0
  private readonly FOOTSTEP_INTERVAL = 280
  private buildZone: Phaser.GameObjects.Zone | null = null
  private homeDoorZone: Phaser.GameObjects.Zone | null = null
  private crossroadExitZone?: Phaser.GameObjects.Zone
  private buildProgress = 0
  private buildText: Phaser.GameObjects.Text | null = null
  private buildBlueprint?: Phaser.GameObjects.Rectangle
  private homeBuildBackground?: Phaser.GameObjects.Image
  private homeBuildCompleted = false
  private buildingSoundStarted = false
  private hamCollected = false

  constructor() {
    super('World')
  }

  create() {
    this.flags = new FlagSystem(flagsData)
    this.followSystem = new PartyFollowSystem()
    this.sounds = new SoundSystem(this)

    this.cursors = this.input.keyboard?.createCursorKeys()
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,E,N') as {
      w: Phaser.Input.Keyboard.Key
      a: Phaser.Input.Keyboard.Key
      s: Phaser.Input.Keyboard.Key
      d: Phaser.Input.Keyboard.Key
      e: Phaser.Input.Keyboard.Key
      n: Phaser.Input.Keyboard.Key
    }

    this.player = this.physics.add.sprite(140, GAME_HEIGHT / 2, 'jon').setCollideWorldBounds(true)
    this.player.setDisplaySize(34, 66)
    this.player.setSize(34, 66)
    this.bianca = this.physics.add.sprite(110, GAME_HEIGHT / 2, 'bianca').setCollideWorldBounds(true)
    this.bianca.setDisplaySize(29, 60)
    this.bianca.setSize(29, 60)
    this.megabyte = this.physics.add
      .sprite(90, GAME_HEIGHT / 2, 'megabyte')
      .setCollideWorldBounds(true)
      .setActive(false)
      .setVisible(false)
    this.megabyte.setDisplaySize(45, 36)
    this.megabyte.setSize(45, 36)
    this.kira = this.physics.add
      .sprite(100, GAME_HEIGHT / 2, 'kira')
      .setCollideWorldBounds(true)
      .setActive(false)
      .setVisible(false)
    this.kira.setDisplaySize(40, 40)
    this.kira.setSize(40, 40)

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT)

    this.biancaFollow = {
      sprite: this.bianca,
      target: this.player,
      speed: 120,
      minDistance: 26,
      enabled: false,
    }
    this.megabyteFollow = {
      sprite: this.megabyte,
      target: this.player,
      speed: 100,
      minDistance: 30,
      enabled: false,
    }

    this.followSystem.add(this.biancaFollow)
    this.followSystem.add(this.megabyteFollow)

    this.input.keyboard?.on('keydown-N', () => {
      console.log('[debug] skip stage', this.stageIndex)
      this.transitionToNextStage(0)
    })

    this.input.keyboard?.on('keydown-E', () => {
      if (this.stageIndex === 4 || this.stageIndex === 5) {
        this.handleMegabyteSit()
      }
    })

    // Mobile action button handler
    gameEvents.on('mobile-action-pressed', () => {
      if (this.stageIndex === 4 || this.stageIndex === 5) {
        this.handleMegabyteSit()
      }
    })

    this.startStage(0)
  }

  update(_: number, delta: number) {
    if (this.keys?.n && Phaser.Input.Keyboard.JustDown(this.keys.n)) {
      console.log('[debug] skip stage', this.stageIndex)
      this.transitionToNextStage(0)
      return
    }

    if (!this.controlsEnabled) {
      console.log('[debug] Controls disabled')
      return
    }

    this.handleMovement()
    this.followSystem.update(delta / 1000, this.controlledSprite)
    this.faceEachOther()

    switch (this.stageIndex) {
      case 1:
        this.updateMoveIn()
        break
      case 2:
        this.updateHomeBuild(delta)
        break
      case 3:
        this.updateMegabyteJoin()
        break
      case 4:
        this.updateHealthStage()
        break
      case 5:
        this.updateCrossroad()
        break
      case 7:
        this.updatePicnicEngagement()
        break
      case 8:
        this.updateLastTile()
        break
      default:
        break
    }
  }

  private handleMovement() {
    const target = this.controlledSprite ?? this.player
    
    // Get mobile input from UI scene
    const uiScene = this.scene.get('UI') as any
    const mobileInput = uiScene?.mobileInput || { x: 0, y: 0 }
    
    // Combine keyboard and mobile input
    const inputX =
      (this.cursors?.left?.isDown || this.keys?.a?.isDown ? -1 : 0) +
      (this.cursors?.right?.isDown || this.keys?.d?.isDown ? 1 : 0) +
      mobileInput.x
    const inputY =
      (this.cursors?.up?.isDown || this.keys?.w?.isDown ? -1 : 0) +
      (this.cursors?.down?.isDown || this.keys?.s?.isDown ? 1 : 0) +
      mobileInput.y

    const speed = this.getPlayerSpeed()
    const velocity = new Phaser.Math.Vector2(inputX, inputY).normalize().scale(speed)

    if (Number.isNaN(velocity.x)) {
      target.setVelocity(0, 0)
      return
    }

    target.setVelocity(velocity.x, velocity.y)
    if (velocity.x !== 0 || velocity.y !== 0) {
      this.logMovement(target)
      const now = this.time.now
      if (now - this.lastFootstepTime > this.FOOTSTEP_INTERVAL) {
        this.sounds.play('footstep', { volume: 0.3 })
        this.lastFootstepTime = now
      }
    }
  }

  private getPlayerSpeed() {
    if (this.stageIndex === 4) return 80
    if (this.stageIndex === 1) {
      const closeToBianca = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bianca.x, this.bianca.y) < 52
      return closeToBianca ? 160 : 110
    }
    return 130
  }

  private startStage(index: number) {
    this.stageIndex = index
    this.controlledSprite = this.player
    this.cleanupStage()
    gameEvents.emit('heart-progress', Math.min(1, index / WorldScene.MAX_STAGE_INDEX))

    switch (index) {
      case 0:
        this.setupPrologue()
        break
      case 1:
        this.setupMoveIn()
        break
      case 2:
        this.setupHomeBuild()
        break
      case 3:
        this.setupMegabyteJoin()
        break
      case 4:
        this.setupHealthStage()
        break
      case 5:
        this.setupCrossroad()
        break
      case 6:
        this.setupFinalPath()
        break
      case 7:
        this.setupPicnicEngagement()
        break
      case 8:
        this.setupLastTile()
        break
      case 9:
        this.setupQuestComplete()
        break
      default:
        break
    }
  }

  private cleanupStage() {
    this.sounds.stopAll()
    this.stageObjects.forEach((object) => object.destroy())
    this.stageObjects = []
    this.stageColliders.forEach((collider) => collider.destroy())
    this.stageColliders = []
    this.stageState = {}
    this.boxes = []
    this.moveInZone = null
    this.buildZone = null
    this.buildProgress = 0
    this.buildText = null
    this.megabyteSitting = false
    this.hamCollected = false
    this.buildingSoundStarted = false
    this.megabyte.setTint(0xffffff)
    this.kira.setActive(false).setVisible(false).setAlpha(1)
    if (this.stageTimer) {
      this.stageTimer.remove(false)
      this.stageTimer = null
    }
  }

  private transitionToNextStage(delay = 300) {
    if (this.stageState.completed) return
    this.stageState.completed = true
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.stageTimer = this.time.addEvent({
      delay,
      callback: () => {
        this.startStage(this.stageIndex + 1)
        this.cameras.main.fadeIn(300, 0, 0, 0)
      },
    })
  }

  private setupPrologue() {
    this.cameras.main.setBackgroundColor(0x2b2430)
    const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'scene-1-coronado')
    background.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    background.setDepth(-100)
    this.player.setPosition(221, 210)
    this.bianca.setPosition(398, 217)
    this.biancaFollow.enabled = false
    this.controlledSprite = this.bianca
    this.logPositions('prologue')
    gameEvents.emit('ui-message', this.dialogue.prologueInstruction, 6600)

    const trigger = this.add.zone(this.player.x, this.player.y, 48, 48)
    this.physics.add.existing(trigger)
    const collider = this.physics.add.overlap(this.bianca, trigger, () => {
      if (this.stageState.triggered) return
      this.stageState.triggered = true
      gameEvents.emit('ui-dialogue', this.dialogue.prologue, () => {
        this.flags.set('met_bianca', true)
        this.flags.set('friendship_unlocked', true)
        this.biancaFollow.enabled = true
        
        gameEvents.emit('ui-message', '✨ FRIENDSHIP UNLOCKED ✨', 2400)
        this.time.delayedCall(3000, () => {
          gameEvents.emit('ui-message', this.dialogue.prologueHint, 3600)
          this.time.delayedCall(4200, () => {
            this.transitionToNextStage()
          })
        })
      })
    })

    this.stageObjects.push(background, trigger)
    this.stageColliders.push(collider)
  }

  private setupMoveIn() {
    this.cameras.main.setBackgroundColor(0x242a36)
    const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'scene-2-house-moving-in')
    background.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    background.setDepth(-100)
    this.player.setPosition(120, GAME_HEIGHT / 2)
    this.bianca.setPosition(90, GAME_HEIGHT / 2 + 10)
    this.stageObjects.push(background)
    this.logPositions('move_in')

    this.controlsEnabled = false
    const heart = this.add.text((this.player.x + this.bianca.x) / 2, (this.player.y + this.bianca.y) / 2 - 28, '<3', {
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: '20px',
      color: '#f5b5c8',
    })
    heart.setOrigin(0.5)
    this.stageObjects.push(heart)
    this.tweens.add({
      targets: heart,
      y: heart.y - 10,
      alpha: 0,
      duration: 1200,
      onComplete: () => heart.destroy(),
    })

    gameEvents.emit('ui-dialogue', this.dialogue.moveInTogether, () => {
      this.controlsEnabled = true
      gameEvents.emit('ui-message', this.dialogue.moveInHint, 6600)
    })

    const boxPositions = [
      { x: 360, y: 255 },
      { x: 380, y: 258 },
      { x: 395, y: 265 },
    ]
    this.boxes = boxPositions.map((position) => {
      const box = this.physics.add.sprite(position.x, position.y, 'box')
      box.setDrag(500, 500)
      box.setBounce(0.1)
      box.setCollideWorldBounds(true)
      return box
    })
    let rectangle = {
      x: 35,
      y: 45,
      width: 213,
      height: 60,
    } 
    this.moveInZone = new Phaser.Geom.Rectangle(rectangle.x, rectangle.y, rectangle.width, rectangle.height)

    const zoneVisual = this.add.rectangle(rectangle.x + rectangle.width/2, rectangle.y + rectangle.height/2, rectangle.width, rectangle.height)
    zoneVisual.setStrokeStyle(2, 0x6fb1a3, 0.8)
    zoneVisual.setFillStyle(0x6fb1a3, 0.1)

    this.stageObjects.push(...this.boxes, zoneVisual)
    this.stageColliders.push(this.physics.add.collider(this.player, this.boxes))
    this.stageColliders.push(this.physics.add.collider(this.bianca, this.boxes))
  }

  private updateMoveIn() {
    if (!this.moveInZone || this.stageState.completed) return
    const allInZone = this.boxes.length > 0 && this.boxes.every((box) => this.moveInZone?.contains(box.x, box.y))
    if (allInZone) {
      this.flags.set('moved_in', true)
      this.transitionToNextStage()
    }
  }

  private setupHomeBuild() {
    this.cameras.main.setBackgroundColor(0x1f2b2b)
    const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'scene-3-construction-before')
    background.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    background.setDepth(-100)
    this.player.setPosition(140, 140)
    this.bianca.setPosition(110, 160)
    this.logPositions('home_build')

    gameEvents.emit('ui-message', this.dialogue.homeBuildHint, 6600)

    const zone = this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, 140, 120)
    this.physics.add.existing(zone)
    this.buildZone = zone

    const blueprint = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 140, 120)
    blueprint.setStrokeStyle(2, 0x6fb1a3, 0.8)
    this.buildBlueprint = blueprint

    this.buildText = this.add.text(GAME_WIDTH / 2 - 40, GAME_HEIGHT / 2 - 6, '0%')

    const doorZone = this.add.zone(514, 124, 56, 56)
    this.physics.add.existing(doorZone)
    this.homeDoorZone = doorZone

    this.homeBuildBackground = background
    this.homeBuildCompleted = false
    this.stageObjects.push(background, zone, blueprint, this.buildText, doorZone)
  }

  private updateHomeBuild(delta: number) {
    if (!this.buildZone || this.stageState.completed || !this.buildText) return
    const bothPresent =
      this.buildZone.getBounds().contains(this.player.x, this.player.y) &&
      this.buildZone.getBounds().contains(this.bianca.x, this.bianca.y)

    if (bothPresent) {
      this.buildProgress = Math.min(1, this.buildProgress + delta * 0.00035)
      if (!this.buildingSoundStarted) {
        this.buildingSoundStarted = true
        this.sounds.play('building', { volume: 0.25, seek: 2 })
      }
    } else {
      if (this.buildingSoundStarted && this.sounds.isPlaying('building')) {
        this.sounds.stop('building')
        this.buildingSoundStarted = false
      }
    }

    this.buildText.setText(`${Math.floor(this.buildProgress * 100)}%`)

    if (this.buildProgress >= 1 && !this.homeBuildCompleted) {
      this.homeBuildCompleted = true
      this.stageState.triggered = true
      this.sounds.stop('building')
      if (this.homeBuildBackground) {
        this.homeBuildBackground.setTexture('scene-3-construction-after')
      }
      this.flags.set('home_built', true)
      gameEvents.emit('ui-message', this.dialogue.homeBuildComplete, 6000)
      this.time.delayedCall(6600, () => {
        gameEvents.emit('ui-message', this.dialogue.homeBuildEnter, 6000)
      })
      this.buildBlueprint?.setVisible(false)
      this.buildText?.setVisible(false)
    }

    if (!this.homeDoorZone || !this.stageState.triggered || this.stageState.completed) return
    const bothAtDoor =
      this.homeDoorZone.getBounds().contains(this.player.x, this.player.y) &&
      this.homeDoorZone.getBounds().contains(this.bianca.x, this.bianca.y)
    if (bothAtDoor) {
      this.sounds.play('door')
      this.transitionToNextStage(800)
    }
  }

  private setupMegabyteJoin() {
    this.cameras.main.setBackgroundColor(0x2b2a2f)
    const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'scene-4-megabyte-joins')
    background.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    background.setDepth(-100)
    this.player.setPosition(160, GAME_HEIGHT / 2)
    this.bianca.setPosition(130, GAME_HEIGHT / 2 + 14)
    this.logPositions('megabyte_join')

    gameEvents.emit('ui-message', this.dialogue.megabyteJoinHint, 5000)

    this.stageObjects.push(background)

    // Megabyte starts at top-right
    this.megabyte.setActive(true).setVisible(true)
    this.megabyte.setPosition(486, 93)
    this.megabyteFollow.enabled = false

    this.sounds.play('megabyte-join')

    // Phase 1: Tween to intermediate position (508, 265)
    this.tweens.add({
      targets: this.megabyte,
      x: 508,
      y: 265,
      duration: 3000,
      onComplete: () => {
        // Phase 2: Enable follow to walk toward the player
        this.megabyteFollow.enabled = true
        this.flags.set('megabyte_joined', true)
        this.sounds.play('megabyte-bark')
        gameEvents.emit('ui-message', this.dialogue.megabyteWelcome, 3500)
        // stageState.triggered will be checked in updateMegabyteJoin
        this.stageState.triggered = true
      },
    })
  }

  private updateMegabyteJoin() {
    if (!this.stageState.triggered || this.stageState.completed) return

    // Check if Megabyte is close to the player
    const distance = Phaser.Math.Distance.Between(
      this.megabyte.x, this.megabyte.y,
      this.player.x, this.player.y
    )

    if (distance < 50 && !this.megabyteSitting) {
      // Megabyte arrived — stop and sit
      this.megabyteFollow.enabled = false
      this.megabyte.setVelocity(0, 0)
      this.megabyteSitting = true
      this.megabyte.setTexture('megabyte-sitting')

      // Spawn clickable heart above Megabyte
      const heart = this.add.text(this.megabyte.x, this.megabyte.y - 30, '❤️', {
        fontSize: '24px',
      })
      heart.setOrigin(0.5)
      heart.setInteractive({ useHandCursor: true })
      this.stageObjects.push(heart)

      // Pulse animation on the heart
      this.tweens.add({
        targets: heart,
        scale: 1.2,
        yoyo: true,
        repeat: -1,
        duration: 600,
      })

      // Click/tap on heart triggers transition
      heart.on('pointerdown', () => {
        if (this.stageState.completed) return
        this.sounds.play('megabyte-bark')
        heart.destroy()
        this.transitionToNextStage(800)
      })
    }
  }

  private setupHealthStage() {
    this.cameras.main.setBackgroundColor(0x26222c)
    const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'scene-5-health')
    background.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    background.setDepth(-100)
    this.player.setPosition(130, GAME_HEIGHT / 2)
    this.bianca.setPosition(100, GAME_HEIGHT / 2 + 20)
    this.megabyte.setPosition(90, GAME_HEIGHT / 2 - 20)
    this.logPositions('health_stage')

    gameEvents.emit('ui-message', this.dialogue.healthHint, 6600)

    const ground = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 100, GAME_HEIGHT - 140)
    ground.setStrokeStyle(2, 0x705060, 0.8)
    ground.setFillStyle(0x3d2f3a, 0.15)

    const potion = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 'potion')
    potion.setImmovable(true)

    this.tweens.add({ targets: potion, scale: 1.1, yoyo: true, repeat: -1, duration: 900 })

    const collider = this.physics.add.overlap(this.player, potion, () => {
      if (this.stageState.completed) return
      const biancaClose = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bianca.x, this.bianca.y) < 70
      const megabyteReady = this.megabyteSitting
      if (biancaClose && megabyteReady) {
        this.sounds.play('item-collect')
        this.flags.set('health_challenge_complete', true)
        ground.setFillStyle(0x35443f)
        gameEvents.emit('ui-message', this.dialogue.healthComplete, 5400)
        this.transitionToNextStage(1800)
      } else {
        gameEvents.emit('ui-message', 'The potion needs Bianca nearby and Megabyte sitting. Press E near him.', 6600)
      }
    })

    this.stageObjects.push(background, ground, potion)
    this.stageColliders.push(collider)
  }

  private updateHealthStage() {
    // E key is now handled via event listener in create()
  }

  private handleMegabyteSit() {
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.megabyte.x, this.megabyte.y)
    const closeToMegabyte = distance < 60

    if (closeToMegabyte) {
      this.megabyteSitting = !this.megabyteSitting
      this.megabyteFollow.enabled = !this.megabyteSitting

      // Swap sprite texture instead of tinting
      this.megabyte.setTexture(this.megabyteSitting ? 'megabyte-sitting' : 'megabyte')

      if (!this.megabyteSitting) {
        this.sounds.play('megabyte-bark')
      }

      gameEvents.emit('ui-message', this.megabyteSitting ? 'Megabyte sits and waits.' : 'Megabyte is ready to move.', 4500)
    } else {
      gameEvents.emit('ui-message', 'Too far from Megabyte. Get closer and press E.', 3000)
    }
  }

  private setupCrossroad() {
    this.cameras.main.setBackgroundColor(0x1f2433)
    const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'scene-6-crossroad')
    background.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    background.setDepth(-100)
    this.player.setPosition(120, GAME_HEIGHT / 2)
    this.bianca.setPosition(90, GAME_HEIGHT / 2 + 20)
    this.megabyte.setPosition(80, GAME_HEIGHT / 2 - 20)
    this.logPositions('crossroad')

    // Megabyte starts sitting (anxious)
    this.megabyteSitting = true
    this.megabyteFollow.enabled = false
    this.megabyte.setTexture('megabyte-sitting')

    gameEvents.emit('ui-message', this.dialogue.crossroadHint, 6600)

    // Kira enters from below
    this.kira.setActive(true).setVisible(true)
    this.kira.setPosition(186, 354)
    this.kira.setAlpha(0)

    // Animate Kira entering: (186,354) → (180,233)
    this.tweens.add({
      targets: this.kira,
      x: 180,
      y: 233,
      alpha: 1,
      duration: 2500,
      delay: 1000,
      onComplete: () => {
        this.time.delayedCall(1500, () => {
          this.sounds.play('megabyte-anxious')
          gameEvents.emit('ui-message', 'Megabyte looks anxious. Press E to comfort her.', 5000)
          this.stageState.triggered = true
        })
      }
    })

    // Exit indicator - subtle visual hint
    const exitIndicator = this.add.rectangle(GAME_WIDTH - 60, 220, 60, 70)
    exitIndicator.setStrokeStyle(2, 0x6fb1a3, 0.6)
    exitIndicator.setFillStyle(0x6fb1a3, 0.08)

    const exitZone = this.add.zone(GAME_WIDTH - 60, 220, 60, 70)
    this.physics.add.existing(exitZone)
    this.crossroadExitZone = exitZone

    const collider = this.physics.add.overlap(this.player, exitZone, () => {
      if (this.stageState.completed) return
      
      // Check if Megabyte is following (not sitting)
      if (this.megabyteSitting) {
        gameEvents.emit('ui-message', 'Megabyte needs you. Help her feel safe first.', 4000)
        return
      }
      
      // Check if Megabyte is close
      const megabyteClose = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.megabyte.x, this.megabyte.y) < 80
      if (!megabyteClose) {
        gameEvents.emit('ui-message', 'Wait for Megabyte to catch up.', 3000)
        return
      }

      this.flags.set('kira_crossroad_complete', true)
      gameEvents.emit('ui-message', this.dialogue.crossroadFarewell, 4800)
      this.transitionToNextStage(5200)
    })

    this.stageObjects.push(background, exitIndicator, exitZone)
    this.stageColliders.push(collider)
  }

  private updateCrossroad() {
    if (this.stageState.triggered && !this.megabyteSitting && this.kira.visible) {
      this.stageState.triggered = false

      gameEvents.emit('ui-message', 'Kira found her own path. Time to move forward.', 4500)

      // Kira exit via waypoints
      const waypoints = [
        { x: 175, y: 298 },
        { x: 248, y: 154 },
        { x: 206, y: 121 },
        { x: 108, y: 103 },
        { x: 180, y: 149 },
      ]

      let waypointIndex = 0
      const moveToNext = () => {
        if (waypointIndex >= waypoints.length) {
          // Fade out at final waypoint
          this.tweens.add({
            targets: this.kira,
            alpha: 0,
            duration: 600,
            onComplete: () => {
              this.kira.setActive(false).setVisible(false)
            },
          })
          return
        }
        const wp = waypoints[waypointIndex]
        waypointIndex++
        const dist = Phaser.Math.Distance.Between(this.kira.x, this.kira.y, wp.x, wp.y)
        const speed = 80 // pixels per second
        const duration = (dist / speed) * 1000
        this.tweens.add({
          targets: this.kira,
          x: wp.x,
          y: wp.y,
          duration,
          onComplete: moveToNext,
        })
      }

      // Start after a brief delay
      this.time.delayedCall(500, moveToNext)
    }
  }

  private setupFinalPath() {
    this.cameras.main.setBackgroundColor(0x2d3436)
    const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'scene-7-home-life')
    background.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    background.setDepth(-100)
    this.player.setPosition(140, GAME_HEIGHT / 2 + 40)
    this.bianca.setPosition(110, GAME_HEIGHT / 2 + 50)
    this.megabyte.setPosition(GAME_WIDTH / 2 + 80, GAME_HEIGHT / 2 + 60)
    this.logPositions('final_path')

    this.hamCollected = false
    gameEvents.emit('ui-message', 'Home sweet home. Grab the ham and bring it to Megabyte\'s bowl.', 5400)

    // Food bowl for Megabyte (left side)
    const foodBowl = this.add.circle(413, 129, 12, 0x8B4513, 0.08)
    foodBowl.setStrokeStyle(2, 0x654321, 0.15)
    
    // Game console / TV area (right side)
    const gameZone = this.add.rectangle(174, 177, 80, 60, 0x2c3e50, 0.2)
    gameZone.setStrokeStyle(2, 0x3498db, 0.8)
    
    // Ham pickup
    const hamLabel = this.add.text(530, 57, '🍖', { fontSize: '20px' })
    hamLabel.setOrigin(0.5)

    // Labels
    const gameLabel = this.add.text(174, 137, '🎮', { fontSize: '20px' })
    gameLabel.setOrigin(0.5)

    // Interaction zones
    const feedZone = this.add.zone(413, 129, 60, 60)
    this.physics.add.existing(feedZone)
    
    const hamZone = this.add.zone(530, 57, 50, 50)
    this.physics.add.existing(hamZone)
    
    const gameZonePhysics = this.add.zone(174, 177, 80, 60)
    this.physics.add.existing(gameZonePhysics)

    const hamCollider = this.physics.add.overlap(this.player, hamZone, () => {
      if (this.hamCollected) return
      this.hamCollected = true
      this.sounds.play('item-collect')
      hamLabel.setVisible(false)
      const body = hamZone.body as Phaser.Physics.Arcade.Body
      body.enable = false
      gameEvents.emit('ui-message', 'You grabbed the ham. Bring it to the bowl.', 3200)
    })

    // Feed Megabyte interaction
    const feedCollider = this.physics.add.overlap(this.player, feedZone, () => {
      if (this.stageState.triggered) return
      
      if (!this.hamCollected) {
        gameEvents.emit('ui-message', 'Find the ham first.', 3000)
        return
      }

      const megabyteClose = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.megabyte.x, this.megabyte.y) < 100
      if (megabyteClose) {
        this.stageState.triggered = true
        this.sounds.play('bowl-fill')
        foodBowl.setFillStyle(0xD2691E, 0.2) // Filled bowl
        gameEvents.emit('ui-message', 'Ham delivered. Megabyte is fed and happy.', 4000)

        // Move Megabyte to rest near the bowl
        this.tweens.add({
          targets: this.megabyte,
          x: 443,
          y: 129,
          duration: 1500,
          onComplete: () => {
            this.megabyte.setTexture('megabyte-sitting')
          }
        })
      } else {
        gameEvents.emit('ui-message', 'Call Megabyte over to the bowl.', 3000)
      }
    })

    // Play games interaction
    const playCollider = this.physics.add.overlap(this.player, gameZonePhysics, () => {
      if (!this.stageState.triggered) {
        gameEvents.emit('ui-message', 'Bring the ham to Megabyte first.', 3000)
        return
      }
      
      if (this.stageState.completed) return
      
      gameZone.setFillStyle(0x3498db, 0.2) // Screen lights up
      gameEvents.emit('ui-message', 'Player 2 has joined! This is the life. ❤️', 5000)
      this.transitionToNextStage(5500)
    })

    this.stageObjects.push(background, foodBowl, gameZone, hamLabel, gameLabel, feedZone, hamZone, gameZonePhysics)
    this.stageColliders.push(hamCollider, feedCollider, playCollider)
  }

  private setupPicnicEngagement() {
    this.cameras.main.setBackgroundColor(0x2f3a2f)
    const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'scene-9-proposal')
    background.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    background.setDepth(-100)

    this.player.setTexture('jon-proposal-standing')
    this.player.setDisplaySize(34, 66)
    this.player.setSize(34, 66)
    this.bianca.setTexture('bianca')
    this.bianca.setDisplaySize(29, 60)
    this.bianca.setSize(29, 60)
    this.player.setPosition(180, GAME_HEIGHT / 2 + 100)
    this.bianca.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2)
    this.megabyte.setActive(false).setVisible(false)
    this.biancaFollow.enabled = false
    this.controlledSprite = this.player
    this.logPositions('picnic_engagement')

    gameEvents.emit('ui-message', 'A quiet picnic before forever.', 4800)

    const picnicSpot = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 120, 80, 0xd9b46b, 0.12)
    picnicSpot.setStrokeStyle(2, 0xf4e3b5, 0.4)

    const picnicZone = this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, 50, 80)
    this.physics.add.existing(picnicZone)

    const picnicCollider = this.physics.add.overlap(this.player, picnicZone, () => {
      if (this.stageState.triggered) return
      this.stageState.triggered = true
      this.player.setVelocity(0, 0)
      this.player.setTexture('jon-proposal-knee')
      this.player.setDisplaySize(40, 58)
      this.player.setSize(40, 58)

      gameEvents.emit('ui-dialogue', this.dialogue.proposal, () => {
        this.flags.set('engaged', true)
        gameEvents.emit('ui-message', 'She said YES! 💍❤️', 4000)
        this.time.delayedCall(4500, () => {
          this.transitionToNextStage()
        })
      })

      if (this.player.x < this.bianca.x) {
        this.player.setFlipX(true)
      }
    })

    this.stageObjects.push(background, picnicSpot, picnicZone)
    this.stageColliders.push(picnicCollider)
  }

  private updatePicnicEngagement() {
    // No-op for now.
  }

  private setupLastTile() {
    this.cameras.main.setBackgroundColor(0x2a2b24)
    this.player.setPosition(290, 82)
    this.bianca.setPosition(243, 303)
    this.megabyte.setPosition(184, 131)
    this.player.setTexture('jon-wedding')
    this.player.setDisplaySize(40, 78)
    this.player.setSize(40, 78)
    this.bianca.setTexture('bianca-wedding')
    this.bianca.setDisplaySize(55, 72)
    this.bianca.setSize(55, 72)
    this.megabyte.setTexture('megabyte-sitting')
    this.megabyte.setDisplaySize(32, 36)
    this.megabyte.setSize(32, 36)
    this.megabyte.setActive(true).setVisible(true)
    this.controlledSprite = this.bianca
    this.biancaFollow.enabled = false
    this.megabyteFollow.enabled = false
    this.player.setVelocity(0, 0)
    this.player.setImmovable(true)
    this.logPositions('last_tile')
    gameEvents.emit('ui-message', this.dialogue.lastTileInstruction, 6600)

    const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'scene-8-wedding')
    background.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    background.setDepth(-100)

    const altar = this.add.sprite(346, 106, 'altar')
    const exitZone = this.add.zone(346, 106, 60, 60)
    this.physics.add.existing(exitZone)

    const collider = this.physics.add.overlap(this.bianca, exitZone, () => {
      if (this.stageState.completed) return
      this.flags.set('at_altar', true)
      this.transitionToNextStage(700)
    })

    this.stageObjects.push(background, altar, exitZone)
    this.stageColliders.push(collider)
  }

  private updateLastTile() {
    // No-op for now.
  }

  private setupQuestComplete() {
    this.cameras.main.setBackgroundColor(0x1a1d22)
    this.controlsEnabled = false
    this.player.setVelocity(0, 0)
    this.bianca.setVelocity(0, 0)
    this.megabyte.setVelocity(0, 0)
    this.logPositions('quest_complete')

    this.flags.set('quest_complete', true)

    const finalText = [
      'Quest Complete',
      '',
      'Bianca & Jon',
      '',
      'This adventure doesn\'t end here.',
      'It just unlocked co-op mode.',
      '',
      'With Megabyte \uD83D\uDC3E',
      '',
      'Made with love by Eli & Cheska',
    ]

    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, finalText.join('\n'), {
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: '16px',
      color: '#f4f1e8',
      align: 'center',
    })
    text.setOrigin(0.5)
    this.stageObjects.push(text)
  }

  private faceEachOther() {
    const playerMoving = Math.abs(this.player.body?.velocity.x ?? 0) > 0.5
    const biancaMoving = Math.abs(this.bianca.body?.velocity.x ?? 0) > 0.5

    if (playerMoving) {
      this.player.setFlipX((this.player.body?.velocity.x ?? 0) > 0)
    }
    if (biancaMoving) {
      this.bianca.setFlipX((this.bianca.body?.velocity.x ?? 0) > 0)
    }

    if (!playerMoving && !biancaMoving) {
      const playerOnLeft = this.player.x < this.bianca.x
      this.player.setFlipX(playerOnLeft)
      this.bianca.setFlipX(!playerOnLeft)
    }
  }

  private logPositions(stage: string) {
    const positions = {
      stage,
      jon: { x: Math.round(this.player.x), y: Math.round(this.player.y) },
      bianca: { x: Math.round(this.bianca.x), y: Math.round(this.bianca.y) },
      megabyte: this.megabyte?.active
        ? { x: Math.round(this.megabyte.x), y: Math.round(this.megabyte.y) }
        : null,
      kira: this.kira?.active ? { x: Math.round(this.kira.x), y: Math.round(this.kira.y) } : null,
    }
    console.log('[positions]', positions)
  }

  private logMovement(sprite: Phaser.Physics.Arcade.Sprite) {
    const x = Math.round(sprite.x)
    const y = Math.round(sprite.y)
    if (this.lastLogged?.sprite === sprite && this.lastLogged.x === x && this.lastLogged.y === y) {
      return
    }
    this.lastLogged = { sprite, x, y }
    const label = sprite === this.player ? 'jon' : sprite === this.bianca ? 'bianca' : 'sprite'
    console.log('[move]', { label, x, y })
  }
}
