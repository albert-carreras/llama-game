import {characterNames, lores} from './characters.js'
class MyGame extends Phaser.Scene {
    constructor() {
        super();
        this.player = null;
        this.dialogueText = null;
        this.gameControls = null;
        this.activeNPC = null;
    }

    preload() {
        characterNames.forEach((name) => {
            this.load.spritesheet(name, `/static/images/${name}.png`, { frameWidth: 32, frameHeight: 32 });
        })
        this.load.spritesheet('idle', '/static/images/Adam_idle_anim_16x16.png', { frameWidth: 16, frameHeight: 32 });
        this.load.spritesheet('walk', '/static/images/Adam_run_16x16.png', { frameWidth: 16, frameHeight: 32 });
        this.load.image('background', '/static/images/background.png');
    }

    create() {
        this.background = this.add.image(400, 300, 'background');
        this.background.scale = 4;

        this.player = this.physics.add.sprite(460, 340, 'idle', 0).setInteractive();
        this.player.scale = 2.5;
        this.physics.world.setBounds(0, 0, 800, 600);
        this.player.setCollideWorldBounds(true);

        this.createAnimations();
        this.player.anims.play('idle');

        this.createNPCs();
        this.cameras.main.startFollow(this.player, true);

        this.gameControls = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC
        });

        this.input.keyboard.on('keydown', this.handleKeyDown, this);
    }

    createAnimations() {
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('idle', { start: 0, end: 23 }),
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-up',
            frames: this.anims.generateFrameNumbers('walk', { start: 6, end: 11 }),
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'walk-down',
            frames: this.anims.generateFrameNumbers('walk', { start: 18, end: 23 }),
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('walk', { start: 12, end: 17 }),
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('walk', { start: 0, end: 5 }),
            frameRate: 8,
            repeat: -1
        });
    }

    createNPCs() {
        characterNames.forEach((npc) => {
            const randomX = Math.floor(Math.random() * 700) + 50;
            const randomY = Math.floor(Math.random() * 500) + 50;
            const randomFrame = Math.floor(Math.random() * 4) * 3;
            const sprite = this.physics.add.sprite(
                randomX,
                randomY,
                npc,
                randomFrame)
                .setInteractive();
            sprite.npcName = npc;
            sprite.scale = 2;
            this.physics.add.overlap(this.player, sprite, this.handleOverlap, null, this);
        })
    }

    handleOverlap(player, npc) {
        if (this.gameControls.space.isDown && Phaser.Input.Keyboard.JustDown(this.gameControls.space)) {
            this.startConversation(npc);
        }
    }

    handleKeyDown(event) {
        if (event.code === 'Escape' && this.dialogueText && this.activeNPC) {
            this.stopConversation();
        }
    }

    update() {
        this.handlePlayerMovement();
        this.updatePlayerAnimation();
        this.checkConversationDistance();
    }

    handlePlayerMovement() {
        this.player.setVelocity(0);

        if (this.gameControls.up.isDown) {
            this.player.setVelocityY(-160);
        } else if (this.gameControls.down.isDown) {
            this.player.setVelocityY(160);
        }

        if (this.gameControls.left.isDown) {
            this.player.setVelocityX(-160);
        } else if (this.gameControls.right.isDown) {
            this.player.setVelocityX(160);
        }
    }

    updatePlayerAnimation() {
        if (this.gameControls.left.isDown) {
            this.player.anims.play('walk-left', true);
        } else if (this.gameControls.right.isDown) {
            this.player.anims.play('walk-right', true);
        } else if (this.gameControls.up.isDown) {
            this.player.anims.play('walk-up', true);
        } else if (this.gameControls.down.isDown) {
            this.player.anims.play('walk-down', true);
        } else {
            this.player.anims.play('idle', true);
        }
    }

    checkConversationDistance() {
        if (this.dialogueText && this.activeNPC) {
            const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.activeNPC.x, this.activeNPC.y);
            const conversationDistance = 100;
            if (distance > conversationDistance) {
                this.stopConversation();
            }
        }
    }

    async startConversation(npc) {
        this.activeNPC = npc;
        this.dialogueText = this.createDialogueText(npc.npcName);
        try {
            const response = await fetch('http://0.0.0.0:8000/conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'hello',
                    npc_name: npc.npcName,
                    system: lores[npc.npcName]
                })
            });

            const data = await response.json();
            this.updateDialogueText(data.message);
        } catch (error) {
            console.error('Error:', error);
            this.stopConversation();
        }

        this.input.keyboard.on('keydown-SPACE', this.handleDialogueInput, this);
    }


    createDialogueText() {
        const dialogueText = this.add.text(0, 0, `${this.activeNPC.npcName.charAt(0).toUpperCase()}${this.activeNPC.npcName.slice(1)}: ...`, {
            font: '18px Arial',
            fill: '#ffffff',
            wordWrap: { width: 600, useAdvancedWrap: true }
        });
        dialogueText.setOrigin(0.5);
        dialogueText.setBackgroundColor('#222');
        dialogueText.setFixedSize(760, 160);
        dialogueText.setPadding(40, 20, 40, 20);
        dialogueText.setScrollFactor(0);
        dialogueText.setPosition(this.cameras.main.centerX, this.cameras.main.height - 80);

        return dialogueText;
    }

    async handleDialogueInput() {
        if (this.dialogueText && this.activeNPC) {
            this.disableGameControls();
            const inputText = window.prompt('Enter your message:');
            this.enableGameControls();

            if (inputText !== null && inputText.trim() !== '') {
                try {
                    const response = await fetch('http://0.0.0.0:8000/conversation', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: inputText,
                            npc_name: this.activeNPC.npcName
                        })
                    });

                    const data = await response.json();
                    this.updateDialogueText(data.message);
                } catch (error) {
                    console.error('Error:', error);
                    this.stopConversation();
                }
            } else {
                this.stopConversation();
            }
        }
    }

    updateDialogueText(text) {
        if (this.dialogueText && this.activeNPC) {
            this.dialogueText.setText(`${this.activeNPC.npcName.charAt(0).toUpperCase()}${this.activeNPC.npcName.slice(1)}: ${text}\n\n\nPress Space to answer or Escape to leave...`);
        }
    }

    stopConversation() {
        if (this.dialogueText && this.activeNPC) {
            this.dialogueText.destroy();
            this.dialogueText = null;
            this.activeNPC = null;
            this.input.keyboard.removeListener('keydown-SPACE', this.handleDialogueInput);
        }
    }

    disableGameControls() {
        this.gameControls.up.enabled = false;
        this.gameControls.left.enabled = false;
        this.gameControls.down.enabled = false;
        this.gameControls.right.enabled = false;
        this.gameControls.space.enabled = false;
        this.gameControls.esc.enabled = false;
    }

    enableGameControls() {
        this.gameControls.up.enabled = true;
        this.gameControls.left.enabled = true;
        this.gameControls.down.enabled = true;
        this.gameControls.right.enabled = true;
        this.gameControls.space.enabled = true;
        this.gameControls.esc.enabled = true;
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 800,
    height: 600,
    scene: MyGame,
    pixelArt: true,
    loader: {
        crossOrigin: 'anonymous'
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
};

const game = new Phaser.Game(config);