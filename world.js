players = [];
enemies = []; //rule is that special enemies will always appear in the first 0, 1, and 3rd index of the array 
playerInventory = []; //inventory to hold items, additional classes will be implemented for skill scrolls
battlescenemap = 'heaven'; //default is heaven, this global variable determines the battle scene map to load
enemy_hp_bars = [];
UIarray = []; //this array keeps track of all the UIs for every character on the map. Needs to be cleared
EnemyUIarray = []; //this array keeps track of all the UIs for every enemy on the map
menus = []; //keeps track of menus




var BootScene = new Phaser.Class({

    Extends: Phaser.Scene,

    initialize:

    function BootScene ()
    {
        Phaser.Scene.call(this, { key: 'BootScene' });
    },

    preload: function ()
    {
        // map tiles
        this.load.image('tiles', 'assets/map/Mapset.png');
        
        // map in json format
        this.load.tilemapTiledJSON('level0', 'assets/map/level0.json');
        
        // enemies
        this.load.image("dragonblue", "assets/dragonblue.png");
        this.load.image("dragonorrange", "assets/dragonorrange.png");
        
        // load all sprites for battle UI
        this.load.image("reenasprite", "assets/sprites/Reena.png");
        this.load.image("alyenesprite", "assets/sprites/Alyene.png");
        
        //load menu items
        this.load.image('attack', "assets/menu/attack.png");
        this.load.image('escape', "assets/menu/escape.png");
        this.load.image('guard', "assets/menu/guard.png");
        this.load.image('items', 'assets/menu/items.png');
        this.load.image('skill', 'assets/menu/skill.png');
        this.load.image('skip', 'assets/menu/skip.png');

        // player 
        this.load.spritesheet('Reena', 'assets/Character Design/main.png', {frameWidth: 128, frameHeight: 128});

        // load the other char for base world, level1 extends world
        this.load.spritesheet('Alyene', 'assets/Character Design/main_chara.png', {frameWidth: 128, frameHeight: 128});
        this.load.spritesheet('Yune', 'assets/Character Design/younger.png', {frameWidth: 128, frameHeight: 128});

        //load battle skills
        this.load.image('rightfulgod', 'assets/skills/rightfulgod.png');    
        this.load.image('cloudnine', 'assets/skills/cloudnine.png');
        this.load.image('almightygod', 'assets/skills/almightygod.png');
        this.load.image('dragonskin', 'assets/skills/dragonskin.png');
        this.load.image('angelictruth', 'assets/skills/angelictruth.png');

        

    },

    create: function ()
    {
        // start the WorldScene
        this.scene.start('WorldScene');
    }
});

var WorldScene = new Phaser.Class({

    Extends: Phaser.Scene,

    initialize:

    function WorldScene ()
    {
        Phaser.Scene.call(this, { key: 'WorldScene' });
    },

    preload: function ()
    {
        
    },

    create: function ()
    {
        //keep an array of all the npcs on this map 
        var npcs = [];
        // create the map
        var level0 = this.make.tilemap({ key: 'level0' });
        
        // first parameter is the name of the tilemap in tiled
        var tiles = level0.addTilesetImage('Mapset', 'tiles');
        
        // creating the layers
        var traverse = level0.createStaticLayer('traverse', tiles, 0, 0);
        var blocked = level0.createStaticLayer('blocked', tiles, 0, 0);
        
        // make all tiles in obstacles collidable
        blocked.setCollisionByExclusion([-1]);

        //list of global attributes that the current player has 

        var animations = []; //a string of animations being stored 

        //load the main player sprite

        
        //  animation with key 'left', we don't need left and right as we will use one and flip the sprite
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('Reena', { frames: [8,9,10,11,12,13,14,15]}),
            frameRate: 5,
            repeat: -1
        });
        
        // animation with key 'right'
        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('Reena', { frames: [0,1,2,3,4,5,6,7] }),
            frameRate: 5,
            repeat: -1
        });
        this.anims.create({
            key: 'up',
            frames: this.anims.generateFrameNumbers('Reena', { frames: [8,9,10,11,12,13,14,15]}),
            frameRate: 5,
            repeat: -1
        });
        this.anims.create({
            key: 'down',
            frames: this.anims.generateFrameNumbers('Reena', { frames: [0,1,2,3,4,5,6,7] }),
            frameRate: 5,
            repeat: -1
        });     
        
        //alyene animations
        this.anims.create({
            key: 'rightalyene',
            frames: this.anims.generateFrameNumbers('Alyene', { frames: [8,9,10,11,12,13,14,15]}),
            frameRate: 5,
            repeat: -1
        });
        this.anims.create({
            key: 'leftalyene',
            frames: this.anims.generateFrameNumbers('Alyene', { frames: [0,1,2,3,4,5,6,7]}),
            frameRate: 5,
            repeat: -1
        });

        //yune animations
        this.anims.create({
            key: 'rightyune',
            frames: this.anims.generateFrameNumbers('Yune', {frames: [8,9,10,11,12,13,14,15]}),
            frameRate: 5,
            repeat: -1
        });

        // our player sprite created through the phycis system
        this.reena = this.physics.add.sprite(640, 128+64, 'Reena', 6);
        
        // don't go out of the map
        this.physics.world.bounds.width = level0.widthInPixels;
        this.physics.world.bounds.height = level0.heightInPixels;
        this.reena.setCollideWorldBounds(true);
        
        // don't walk on trees
        this.physics.add.collider(this.reena, blocked);

        // limit camera to map
        this.cameras.main.setBounds(0, 0, level0.widthInPixels, level0.heightInPixels);
        this.cameras.main.startFollow(this.reena);
        this.cameras.main.roundPixels = true; // avoid tile bleed

        unitReenaSkills1 = new unitSkills("Rightful God","Negates the damage bonus from enemy critical hits", "rightfulgod");
        unitReenaSkills2 = new unitSkills("Cloud Nine","grants SPD + 10% during combat", "cloudnine");
        unitReenaSkills3 = new unitSkills("Rightful God","Negates the damage bonus from enemy critical hits", "rightfulgod");
        unitReenaSkills4 = new unitSkills("Cloud Nine","grants SPD + 10% during combat" , "cloudnine");
        unitReenaSkills5 = new unitSkills("Cloud Nine","grants SPD + 10% during combat", "cloudnine");
        unitReenaSkillArray = [unitReenaSkills1, unitReenaSkills2, unitReenaSkills3, unitReenaSkills4, unitReenaSkills5]; //an array with the two beginning skills
        unitReenaStats = new unitStats(28, 20, 30, 16, 30, 20, 7); //this is Reena's current stats
        reenaAnimations = ['left', 'right'];
        //create a new unit information that stores all of Reena's information 
        unitReenaBattleSkills1 = new unitBattleSkills("Fire Magic", "deals 1x magical damage to opponent", 5, "magic", "single", "firemagic");
        unitReenaBattleSkills2 = new unitBattleSkills("Pure Halo", "deals 1.5x physical damage to opponent", 10, "physical", "single", "purehalo");
        unitReenaBattleSkillArray = [unitReenaBattleSkills1, unitReenaBattleSkills2];

        //create a new unit information that stores all of Reena's information 
        unitReena = new unitInformation(this.reena, "Reena", reenaAnimations, "reenasprite", unitReenaSkillArray, unitReenaStats, null, unitReenaBattleSkillArray); 
        this.reena.anims.play('up', true);
        players.push(unitReena);

        unitReenaSkills1 = new unitSkills("Cloud Nine","grants SPD + 10% during combat", "cloudnine");
        unitReenaSkills2 = new unitSkills("Cloud Nine","grants SPD + 10% during combat", "cloudnine");
        unitReenaSkillArray = [unitReenaSkills1, unitReenaSkills2]; //an array with the two beginning skills
        unitReenaStats = new unitStats(28, 20, 30, 16, 30, 20, 7); //this is Reena's current stats
        reenaAnimations = ['left', 'right'];
        //create a new unit information that stores all of Reena's information 
        unitReenaBattleSkills1 = new unitBattleSkills("Fire Magic", "deals 1x magical damage to opponent", 5, "magic", "single", "firemagic");
        unitReenaBattleSkills2 = new unitBattleSkills("Pure Halo", "deals 1.5x physical damage to opponent", 10, "physical", "single", "purehalo");
        unitReenaBattleSkillArray = [unitReenaBattleSkills1, unitReenaBattleSkills2];

        //create a new unit information that stores all of Reena's information 
        unitReena = new unitInformation(this.reena, "Reena", reenaAnimations, "reenasprite", unitReenaSkillArray, unitReenaStats, null, unitReenaBattleSkillArray); 
        this.reena.anims.play('up', true);
        players.push(unitReena);


        unitReenaSkills1 = new unitSkills("Rightful God","Negates the damage bonus from enemy critical hits", "rightfulgod");
        unitReenaSkills2 = new unitSkills("Rightful God","Negates the damage bonus from enemy critical hits", "rightfulgod");
        unitReenaSkillArray = [unitReenaSkills1, unitReenaSkills2]; //an array with the two beginning skills
        unitReenaStats = new unitStats(28, 20, 30, 16, 30, 20, 7); //this is Reena's current stats
        reenaAnimations = ['left', 'right'];
        //create a new unit information that stores all of Reena's information 
        unitReenaBattleSkills1 = new unitBattleSkills("Fire Magic", "deals 1x magical damage to opponent", 5, "magic", "single", "firemagic");
        unitReenaBattleSkills2 = new unitBattleSkills("Pure Halo", "deals 1.5x physical damage to opponent", 10, "physical", "single", "purehalo");
        unitReenaBattleSkillArray = [unitReenaBattleSkills1, unitReenaBattleSkills2];

        //create a new unit information that stores all of Reena's information 
        unitReena = new unitInformation(this.reena, "Reena", reenaAnimations, "reenasprite", unitReenaSkillArray, unitReenaStats, null, unitReenaBattleSkillArray); 
        this.reena.anims.play('up', true);
        players.push(unitReena);

        
        unitReenaSkills1 = new unitSkills("Rightful God","Negates the damage bonus from enemy critical hits", "rightfulgod");
        unitReenaSkills2 = new unitSkills("Cloud Nine","grants SPD + 10%", "cloudnine");
        unitReenaSkillArray = [unitReenaSkills1, unitReenaSkills2]; //an array with the two beginning skills
        unitReenaStats = new unitStats(28, 20, 30, 16, 30, 20, 7); //this is Reena's current stats
        reenaAnimations = ['left', 'right'];
        //create a new unit information that stores all of Reena's information 
        unitReenaBattleSkills1 = new unitBattleSkills("Fire Magic", "deals 1x magical damage to opponent", 5, "magic", "single", "firemagic");
        unitReenaBattleSkills2 = new unitBattleSkills("Pure Halo", "deals 1.5x physical damage to opponent", 10, "physical", "single", "purehalo");
        unitReenaBattleSkillArray = [unitReenaBattleSkills1, unitReenaBattleSkills2];

        //create a new unit information that stores all of Reena's information 
        unitReena = new unitInformation(this.reena, "Reena", reenaAnimations, "reenasprite", unitReenaSkillArray, unitReenaStats, null, unitReenaBattleSkillArray); 
        this.reena.anims.play('up', true);
        players.push(unitReena);
        
        

        //alyene and yune
        this.alyene = this.physics.add.sprite(640, 2400, 'Alyene', 6).setImmovable();
        this.alyene.anims.play('rightalyene', true);
        npcs.push(this.alyene);


        this.yune = this.physics.add.sprite(768, 2400, 'Yune', 6).setImmovable();
        this.yune.anims.play('rightyune', true);
        npcs.push(this.yune);
    

        // user input
        //this.cursors = this.input.keyboard.createCursorKeys();
        this.cursors = this.input.keyboard.addKeys({
            up: 'W',
            down: 'S',
            left: 'A',
            right: 'D'
        });  // keys.up, keys.down, keys.left, keys.right
        
        // where the enemies will be
        this.spawns = this.physics.add.group({ classType: Phaser.GameObjects.Zone });
        for(var i = 0; i < 30; i++) {
            var x = Phaser.Math.RND.between(0, this.physics.world.bounds.width);
            var y = Phaser.Math.RND.between(0, this.physics.world.bounds.height);
            // parameters are x, y, width, height
            this.spawns.create(x, y, 20, 20);            
        }        
        // add collider
        //this.physics.add.overlap(this.player, this.spawns, this.onMeetEnemy, false, this);
        for (var i = 0; i < npcs.length; i++){
            this.physics.add.collider(this.reena, npcs[i], this.onNpcDialog, false, this);
        }
        // we listen for 'wake' event
        this.sys.events.on('wake', this.wake, this);
    },
    wake: function() {
        this.cursors.left.reset();
        this.cursors.right.reset();
        this.cursors.up.reset();
        this.cursors.down.reset();
    },
    onMeetEnemy: function(player, zone) {        
        // we move the zone to some other location
        zone.x = Phaser.Math.RND.between(0, this.physics.world.bounds.width);
        zone.y = Phaser.Math.RND.between(0, this.physics.world.bounds.height);
        
        // shake the world
        this.cameras.main.shake(300);
        
        this.input.stopPropagation();
        // start battle 
        this.scene.switch('BattleScene');                
    },

    //this detects the nearest npc that the player bumps to, an a dialog will happen for that npc and the player
    //a bunch of if statements, different events will trigger depending on the different npcs encountered in this World
    onNpcDialog: function(player, npc){
        console.log(npc.texture.key);
        if (npc.texture.key === "Alyene"){

            unitAlyeneSkills1 = new unitSkills("Almighty God","Negates damage bonus from enemy critical hits, damage from opponent's attacks reduced by 50%", "almightygod");
            unitAlyeneSkills2 = new unitSkills("Dragon Skin", "Negates the effects of all non-damaging status effects. Nullifies poison damage", "dragonskin");
            unitAlyeneSkills3 = new unitSkills("Angelic Truth", "Halves skill damage received", "angelictruth");
            unitAlyeneSkills4 = new unitSkills("Angelic Truth", "Halves skill damage received", "angelictruth");
            unitAlyeneSkills5 = new unitSkills("Angelic Truth", "Halves skill damage received", "angelictruth");
            unitAlyeneSkillArray = [unitAlyeneSkills1, unitAlyeneSkills2, unitAlyeneSkills3, unitAlyeneSkills4, unitAlyeneSkills5];
            unitAlyeneStats = new unitStats(30, 30, 30, 30, 30, 30, 30); //this is Alyene's current stats
            alyeneAnimations = ['rightalyene', 'leftalyene'];
            unitAlyeneBattleSkills1 = new unitBattleSkills("Alyene is waiting for you to make a move", "Alyene is waiting for you to make a move", "null", "single");
            unitAyleneBattleSkllArray = [unitAlyeneBattleSkills1];

            unitAlyene = new unitInformation(this.alyene, "Alyene", alyeneAnimations, "alyenesprite", unitAlyeneSkillArray, unitAlyeneStats, null, unitAyleneBattleSkllArray);
            enemies.push(unitAlyene);

            unitAlyeneSkills1 = new unitSkills("Angelic Truth", "Halves skill damage received", "angelictruth");
            unitAlyeneSkills2 = new unitSkills("Dragon Skin", "Negates the effects of all non-damaging status effects. Nullifies poison damage", "dragonskin");
            unitAlyeneSkills3 = new unitSkills("Almighty God","Negates damage bonus from enemy critical hits, damage from opponent's attacks reduced by 50%", "almightygod");
            unitAlyeneSkillArray = [unitAlyeneSkills1, unitAlyeneSkills2, unitAlyeneSkills3];
            unitAlyeneStats = new unitStats(30, 30, 30, 30, 30, 30, 30); //this is Alyene's current stats
            alyeneAnimations = ['rightalyene', 'leftalyene'];
            unitAlyeneBattleSkills1 = new unitBattleSkills("Alyene is waiting for you to make a move", "Alyene is waiting for you to make a move", "null", "single");
            unitAyleneBattleSkllArray = [unitAlyeneBattleSkills1];

            unitAlyene = new unitInformation(this.alyene, "Alyene Shadow", alyeneAnimations, "alyenesprite", unitAlyeneSkillArray, unitAlyeneStats, null, unitAyleneBattleSkllArray);
            enemies.push(unitAlyene);


            this.cameras.main.shake(300);
            this.input.stopPropagation();
            this.reena.y -= 20;

            this.scene.switch('BattleScene');
        }
    },

    update: function (time, delta)
    {             
        this.reena.body.setVelocity(0);
        
        // Horizontal movement
        if (this.cursors.left.isDown)
        {
            this.reena.body.setVelocityX(-550);
        }
        else if (this.cursors.right.isDown)
        {
            this.reena.body.setVelocityX(550);
        }
        // Vertical movement
        if (this.cursors.up.isDown)
        {
            this.reena.body.setVelocityY(-550);
        }
        else if (this.cursors.down.isDown)
        {
            this.reena.body.setVelocityY(550);
        }        

        // Update the animation last and give left/right animations precedence over up/down animations
        if (this.cursors.left.isDown)
        {
            this.reena.anims.play('left', true);
            //this.reena.flipX = true;
        }
        else if (this.cursors.right.isDown)
        {
            this.reena.anims.play('right', true);
            this.reena.flipX = false;
        }
        else if (this.cursors.up.isDown)
        {
            this.reena.anims.play('up', true);
        }
        else if (this.cursors.down.isDown)
        {
            this.reena.anims.play('down', true);
        }
        else
        {
            //this.reena.anims.stop();
        }
    }
    
});

//Unit skills consist of skill names and a description, and the skillname will be checked to see the skill effect in the battle method
class unitSkills{
    constructor (skillName, description, spriteName)
    {
        this.skillName = skillName;
        this.description = description; //description and skill names are both strings
        this.spriteName = spriteName;
    }
}

//Unit battle information consist of basic stats of a character, each stat represent different things 
class unitStats{
    constructor (HP, MP, ATK, DEF, RES, SPEED, LUCK)
    {
        this.hp = HP;
        this.maxHP = HP;
        this.mp = MP;
        this.maxMP = MP;
        this.atk = ATK;
        this.def = DEF;
        this.res = RES
        this.spd = SPEED;
        this.luck = LUCK;
    }
}

//Unit battle information consist of the current status effect on the user
class unitStatus{
    constructor (statusName, statusDescription)
    {
        this.statusName = statusName;
        this.statusDescription = statusDescription;
    }
}

//Unit battle skills information. type can be magic, physical, special, or null.
//target can be single or multi
class unitBattleSkills{
    constructor(battleSkillName, battleSkillDescription, mpRequired, type, target){
        this.battleSkillName = battleSkillName;
        this.battleSkillDescription = battleSkillDescription;
        this.mpRequired = mpRequired;
        this.type = type;
        this.target = target;
    }
}

//This class stores all unit's informations, including sprites, skills, and so on. Stored in a single global array
/*unitData consists of phaser sprite data, unitName is the sprite name reference, Animation is an array of animation strings,
unitSprites is a string that represents a unit's sprite, unitSkills represents a skills class, and battle info represents stats like HP, MP, ATTACK, and such
unitStatus is the unit's current status, such as paralysis, bind, poisoned and such 
*/
class unitInformation {
    constructor (unitData, unitName, unitAnimations, unitSprites, unitSkills, unitStats, unitStatus, unitBattleSkills)
    {
        this.unitData = unitData;
        this.unitName = unitName;
        this.unitAnimations = unitAnimations;
        this.unitSprites = unitSprites;
        this.unitSkills = unitSkills;
        this.unitStats = unitStats;
        this.unitStatus = unitStatus;
        this.unitBattleSkills = unitBattleSkills;
        this.isGuarding = false;
    }

}








