import Phaser from 'phaser'

export type FollowEntry = {
  sprite: Phaser.Physics.Arcade.Sprite
  target: Phaser.Physics.Arcade.Sprite
  speed: number
  minDistance: number
  enabled: boolean
}

export default class PartyFollowSystem {
  private readonly entries: FollowEntry[] = []

  add(entry: FollowEntry) {
    this.entries.push(entry)
  }

  update(_deltaSeconds: number, skipSprite?: Phaser.Physics.Arcade.Sprite) {
    for (const entry of this.entries) {
      if (skipSprite && entry.sprite === skipSprite) {
        continue
      }
      if (!entry.enabled) {
        entry.sprite.setVelocity(0, 0)
        continue
      }
      const distance = Phaser.Math.Distance.Between(
        entry.sprite.x,
        entry.sprite.y,
        entry.target.x,
        entry.target.y
      )
      if (distance <= entry.minDistance) {
        entry.sprite.setVelocity(0, 0)
        continue
      }
      const angle = Phaser.Math.Angle.Between(
        entry.sprite.x,
        entry.sprite.y,
        entry.target.x,
        entry.target.y
      )
      entry.sprite.setVelocity(Math.cos(angle) * entry.speed, Math.sin(angle) * entry.speed)
    }
  }
}
