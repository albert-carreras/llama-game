import {characterNames, lores} from './characters.js'
class MyGame extends Phaser.Scene {
    constructor() {
        super();
        this.player = null;
        this.dialogueText = null;
        this.gameControls = null;
        this.activeNPC = null;
        this.angered = [];
        this.lastDirection = 'down';
        this.startTimeout = false;
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
        this.physics.world.setBounds(0, 0, 1600, 1200);
        this.player.setCollideWorldBounds(true);

        this.createAnimations();
        this.player.anims.play('idle-down');

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
            key: 'idle-up',
            frames: this.anims.generateFrameNumbers('idle', { start: 6, end: 11 }),
            frameRate: 4,
            repeat: -1
        });
        this.anims.create({
            key: 'idle-down',
            frames: this.anims.generateFrameNumbers('idle', { start: 18, end: 23 }),
            frameRate: 4,
            repeat: -1
        });
        this.anims.create({
            key: 'idle-left',
            frames: this.anims.generateFrameNumbers('idle', { start: 12, end: 17 }),
            frameRate: 4,
            repeat: -1
        });
        this.anims.create({
            key: 'idle-right',
            frames: this.anims.generateFrameNumbers('idle', { start: 0, end: 5 }),
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
        const spacing = 200;
        const offsetX = 100;
        const offsetY = 100;
        const randomOffsetRange = 100;

        characterNames.forEach((npc, index) => {
            const x = (index % 5) * spacing + offsetX + Math.random() * randomOffsetRange - randomOffsetRange / 2;
            const y = Math.floor(index / 5) * spacing + offsetY + Math.random() * randomOffsetRange - randomOffsetRange / 2;
            const randomFrame = Math.floor(Math.random() * 4) * 3;
            const sprite = this.physics.add.sprite(x, y, npc, randomFrame).setInteractive();
            sprite.npcName = npc;
            sprite.scale = 2;
            this.physics.add.overlap(this.player, sprite, this.handleOverlap, null, this);
        });
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
        if (event.key === "p") {
            console.log(this.angered)
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
            this.lastDirection = 'left';
        } else if (this.gameControls.right.isDown) {
            this.player.anims.play('walk-right', true);
            this.lastDirection = 'right';
        } else if (this.gameControls.up.isDown) {
            this.player.anims.play('walk-up', true);
            this.lastDirection = 'up';
        } else if (this.gameControls.down.isDown) {
            this.player.anims.play('walk-down', true);
            this.lastDirection = 'down';
        } else {
            this.player.anims.play(`idle-${this.lastDirection}`, true);
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

    async parseAnswer(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let responseText = '';
        let parsedMurder = false;
        let previousToken = '';
        let running = true;
        while (running) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            responseText += chunk;
            let lines = responseText.split('\n');

            if (!responseText.endsWith('\n')) {
                responseText = lines.pop();
            } else {
                responseText = '';
            }

            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const prev = previousToken
                    const data = line.substring(6).trimEnd();
                    previousToken = data
                    if (data.includes('}')) {
                        parsedMurder = true
                        if (prev.includes('true')) {
                            this.angered.push(this.activeNPC.npcName)
                            this.handleAngered()
                            running = false
                            break;
                        }
                    } else if (data !== '' && parsedMurder) {
                        this.updateDialogueText(data);
                    }
                }
            }
        }
        if (parsedMurder === false) {
            this.angered.push(this.activeNPC.npcName)
            this.handleAngered()
        }
    }

    handleAngered() {
        this.dialogueText.text = ''
        this.updateDialogueText(`You've angered: ${this.angered.concat()}\n\n${this.angered.length}/10`, true);
        this.input.keyboard.on('keydown-SPACE', this.stopConversation, this);
        this.input.keyboard.removeListener('keydown-SPACE', this.handleDialogueInput);
        this.startTimeout = true
        setTimeout(() => this.startTimeout = false, 2000)
    }

    async startConversation(npc) {
        if (this.startTimeout) {
            return 
        }
        this.activeNPC = npc;
        this.dialogueText = this.createDialogueText(npc.npcName);
        if (this.angered.includes(npc.npcName)) {
            this.handleAngered()
            return;
        }
        this.disableGameControls()
        try {
            const response = await fetch('http://localhost:8000/conversation', {
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

            await this.parseAnswer(response)

        } catch (error) {
            console.error('Error:', error);
            this.stopConversation();
        } finally {
            this.enableGameControls()
        }

        this.input.keyboard.removeListener('keydown-SPACE', this.stopConversation);
        this.input.keyboard.on('keydown-SPACE', this.handleDialogueInput, this);
    }

    async handleDialogueInput() {
        if (this.dialogueText && this.activeNPC) {
            this.disableGameControls();
            const inputText = window.prompt('Enter your message:');
            this.enableGameControls();

            if (inputText !== null && inputText.trim() !== '') {
                try {
                    const response = await fetch('http://localhost:8000/conversation', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: inputText,
                            npc_name: this.activeNPC.npcName
                        })
                    });
                    this.dialogueText.text = '';
                    await this.parseAnswer(response)
                } catch (error) {
                    console.error('Error:', error);
                    this.stopConversation();
                }
            } else {
                this.stopConversation();
            }
        }
    }


    createDialogueText() {
        const dialogueText = this.add.text(0, 0, `${this.activeNPC.npcName.charAt(0).toUpperCase()}${this.activeNPC.npcName.slice(1)}: `, {
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

    updateDialogueText(text, skipName = false) {
        if (this.dialogueText && this.activeNPC) {
            const name = `${this.activeNPC.npcName.charAt(0).toUpperCase()}${this.activeNPC.npcName.slice(1)}: `;
            const continueString = "\n\n\nPress Space to answer or Escape to leave..."
            const currentText = this.dialogueText.text;
            const updatedText = currentText.replace(continueString, '').replace(name, '');
            if (skipName) {
                this.dialogueText.setText(text);
                return
            }
            const newText = `${name}${updatedText}${text}${continueString}`;
            this.dialogueText.setText(newText);
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
    width: 1000,
    height: 800,
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