var config = {
    type: Phaser.GRAPHICS,
    parent: 'content',
    width: 1280,
    height: 1024,
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false // set to true to view zones
        }
    },
    scene: [
        BootScene,
        WorldScene,
        BattleScene,
        UIScene,
        PartyMembersScene,
        SkillScene
    ]
};
var game = new Phaser.Game(config);