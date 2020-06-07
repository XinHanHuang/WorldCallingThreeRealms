var BattleScene = new Phaser.Class({

    Extends: Phaser.Scene,

    initialize:

    function BattleScene ()
    {
        Phaser.Scene.call(this, { key: "BattleScene" });
    },

    create: function ()
    {    
        // change the background to green
        // create the map according to the battle scene (if statements)
        if (battlescenemap === "heaven"){
            var level0 = this.make.tilemap({ key: 'level0' });
            var tiles = level0.addTilesetImage('Mapset', 'tiles');
            // creating the layers
            this.traverse = level0.createStaticLayer('traverse', tiles, 0, 0);
            this.blocked = level0.createStaticLayer('blocked', tiles, 0, 0);
        }


        this.startBattle();
        // on wake event we call startBattle too
        this.sys.events.on('wake', this.startBattle, this);             
    },


    startBattle: function() {
        // player character - warrior
        this.heroes = [];
        this.enemies = [];
        for (var i = 0; i < players.length; i++){
            //for each for loop we are gonna generate new fighting sprites 
            if (i === 0 || i === 1){
                var player = new PlayerCharacter(this, 1280-256, 256 + i*130, players[i].unitName, 1, "Warrior", 100, 20);
                this.add.existing(player);
                player.anims.play(players[0].unitAnimations[0], true);
                this.heroes.push(player);
            }
            else if (i >= 2){
                var player = new PlayerCharacter(this, 1280-256 - 200, 256 + (i-2)*130 + 50, players[i].unitName, 1, "Warrior", 100, 20);
                this.add.existing(player);
                player.anims.play(players[0].unitAnimations[0], true);
                this.heroes.push(player);
            }
        }

        for (var i = 0; i < enemies.length; i++){
            if (i === 0 || i === 1){
                var enemy = new Enemy(this, 256, 256 + i*150, enemies[i].unitName, 1, "Dragon", 50, 3);
                this.add.existing(enemy);
                enemy.anims.play(enemies[0].unitAnimations[0], true);
                this.enemies.push(enemy);
            }
            else if (i >= 2){
                var enemy = new Enemy(this, 256 + 200, 256 + (i-2)*150 + 50, enemies[i].unitName, 1, "Dragon", 50, 3);
                this.add.existing(enemy);
                enemy.anims.play(enemies[0].unitAnimations[0], true);
                this.enemies.push(enemy);
            }
        }


        // array with both parties, who will attack
        this.units = this.heroes.concat(this.enemies);
        
        this.index = -1; // currently active unit
        
        this.scene.run("UIScene");        
    },
    nextTurn: function() {  
        // if we have victory or game over
        if(this.checkEndBattle()) {           
            this.endBattle();
            return;
        }
        do {
            // currently active unit
            this.index++;
            // if there are no more units, we start again from the first one
            if(this.index >= this.units.length) {
                this.index = 0;
            }            
        } while(!this.units[this.index].living);
        // if its player hero
        if(this.units[this.index] instanceof PlayerCharacter) {
            // we need the player to select action and then enemy
            this.events.emit("PlayerSelect", this.index);
        } else { // else if its enemy unit
            // pick random living hero to be attacked
            var r;
            do {
                r = Math.floor(Math.random() * this.heroes.length);
            } while(!this.heroes[r].living) 
            // call the enemy's attack function 
            this.units[this.index].attack(this.heroes[r]);  
            // add timer for the next turn, so will have smooth gameplay
            this.time.addEvent({ delay: 3000, callback: this.nextTurn, callbackScope: this });
        }
    },     
    // check for game over or victory
    checkEndBattle: function() {        
        var victory = true;
        // if all enemies are dead we have victory
        for(var i = 0; i < this.enemies.length; i++) {
            if(this.enemies[i].living)
                victory = false;
        }
        var gameOver = true;
        // if all heroes are dead we have game over
        for(var i = 0; i < this.heroes.length; i++) {
            if(this.heroes[i].living)
                gameOver = false;
        }
        return victory || gameOver;
    },
    // when the player have selected the enemy to be attacked
    receivePlayerSelection: function(action, target) {
        if(action == "attack") {            
            this.units[this.index].attack(this.enemies[target]);              
        }
        // next turn in 3 seconds
        this.time.addEvent({ delay: 3000, callback: this.nextTurn, callbackScope: this });        
    },    
    endBattle: function() {       
        // clear state, remove sprites
        this.heroes.length = 0;
        this.enemies.length = 0;
        for(var i = 0; i < this.units.length; i++) {
            // link item
            this.units[i].destroy();            
        }
        this.units.length = 0;
        // sleep the UI
        this.scene.sleep('UIScene');
        // return to WorldScene and sleep current BattleScene
        this.scene.switch('WorldScene');
    }
});

// base class for heroes and enemies
var Unit = new Phaser.Class({
    Extends: Phaser.GameObjects.Sprite,

    initialize:

    function Unit(scene, x, y, texture, frame, type, hp, damage) {
        Phaser.GameObjects.Sprite.call(this, scene, x, y, texture, frame)
        this.type = type;
        this.maxHp = this.hp = hp;
        this.damage = damage; // default damage     
        this.living = true;         
        this.menuItem = null;
        

    },
    // we will use this to notify the menu item when the unit is dead
    setMenuItem: function(item) {
        this.menuItem = item;
    },
    // attack the target unit
    attack: function(target) {
        if(target.living) {
            target.takeDamage(this.damage);
            this.scene.events.emit("Message", this.type + " attacks " + target.type + " for " + this.damage + " damage");
        }
    },    
    takeDamage: function(damage) {
        if (this.hp.decrease(damage))
        {
            this.alive = false;

            this.play(this.color + 'Dead');

            (this.color === 'blue') ? bluesAlive-- : greensAlive--;
        }

        if(this.hp <= 0) {
            this.hp = 0;
            this.menuItem.unitKilled();
            this.living = false;
            this.visible = false;   
            this.menuItem = null;
        }
    }    
});

var Enemy = new Phaser.Class({
    Extends: Unit,

    initialize:
    function Enemy(scene, x, y, texture, frame, type, hp, damage) {
        Unit.call(this, scene, x, y, texture, frame, type, hp, damage);
        //this.flipX = true;
    }
});

var PlayerCharacter = new Phaser.Class({
    Extends: Unit,

    initialize:
    function PlayerCharacter(scene, x, y, texture, frame, type, hp, damage) {
        Unit.call(this, scene, x, y, texture, frame, type, hp, damage);
        // flip the image so I don"t have to edit it manually
        //this.flipX = true;
        
    }
});

var MenuItem = new Phaser.Class({
    Extends: Phaser.GameObjects.Text,
    
    initialize:
            
    function MenuItem(x, y, text, scene) {
        Phaser.GameObjects.Text.call(this, scene, x, y, text, { color: "#ffffff", align: "left", fontSize: 15});
    },
    
    select: function() {
        this.setColor("#f8ff38");
    },
    
    deselect: function() {
        this.setColor("#ffffff");
    },
    // when the associated enemy or player unit is killed
    unitKilled: function() {
        this.active = false;
        this.visible = false;
    }
    
});

// base menu class, container for menu items
var Menu = new Phaser.Class({
    Extends: Phaser.GameObjects.Container,
    
    initialize:
            
    function Menu(x, y, scene, heroes) {
        Phaser.GameObjects.Container.call(this, scene, x, y);
        this.menuItems = [];
        this.menuItemIndex = 0;
        this.x = x;
        this.y = y;        
        this.selected = false;
    },     
    addMenuItem: function(unit) {
        var menuItem = new MenuItem(0, this.menuItems.length * 20, unit, this.scene);
        this.menuItems.push(menuItem);
        this.add(menuItem); 
        return menuItem;
    },  
    // menu navigation 
    moveSelectionUp: function() {
        this.menuItems[this.menuItemIndex].deselect();
        do {
            this.menuItemIndex--;
            if(this.menuItemIndex < 0)
                this.menuItemIndex = this.menuItems.length - 1;
        } while(!this.menuItems[this.menuItemIndex].active);
        this.menuItems[this.menuItemIndex].select();
    },
    moveSelectionDown: function() {
        this.menuItems[this.menuItemIndex].deselect();
        do {
            this.menuItemIndex++;
            if(this.menuItemIndex >= this.menuItems.length)
                this.menuItemIndex = 0;
        } while(!this.menuItems[this.menuItemIndex].active);
        this.menuItems[this.menuItemIndex].select();
    },
    // select the menu as a whole and highlight the choosen element
    select: function(index) {
        if(!index)
            index = 0;       
        this.menuItems[this.menuItemIndex].deselect();
        this.menuItemIndex = index;
        while(!this.menuItems[this.menuItemIndex].active) {
            this.menuItemIndex++;
            if(this.menuItemIndex >= this.menuItems.length)
                this.menuItemIndex = 0;
            if(this.menuItemIndex == index)
                return;
        }        
        this.menuItems[this.menuItemIndex].select();
        this.selected = true;
    },
    // deselect this menu
    deselect: function() {        
        this.menuItems[this.menuItemIndex].deselect();
        this.menuItemIndex = 0;
        this.selected = false;
    },
    confirm: function() {
        // when the player confirms his slection, do the action
    },
    // clear menu and remove all menu items
    clear: function() {
        for(var i = 0; i < this.menuItems.length; i++) {
            this.menuItems[i].destroy();
        }
        this.menuItems.length = 0;
        this.menuItemIndex = 0;
    },
    // recreate the menu items
    remap: function(units) {
        this.clear();        
        for(var i = 0; i < units.length; i++) {
            var unit = units[i];
            unit.setMenuItem(this.addMenuItem(unit.type));            
        }
        this.menuItemIndex = 0;
    }
});

var HeroesMenu = new Phaser.Class({
    Extends: Menu,
    
    initialize:
            
    function HeroesMenu(x, y, scene) {
        Menu.call(this, x, y, scene);                    
    }
});

var ActionsMenu = new Phaser.Class({
    Extends: Menu,
    
    initialize:
            
    function ActionsMenu(x, y, scene) {
        Menu.call(this, x, y, scene);   
        this.addMenuItem("Attack");
    },
    confirm: function() { 
        // we select an action and go to the next menu and choose from the enemies to apply the action
        this.scene.events.emit("SelectedAction");        
    }
    
});

var EnemiesMenu = new Phaser.Class({
    Extends: Menu,
    
    initialize:
            
    function EnemiesMenu(x, y, scene) {
        Menu.call(this, x, y, scene);        
    },       
    confirm: function() {      
        // the player has selected the enemy and we send its id with the event
        this.scene.events.emit("Enemy", this.menuItemIndex);
    }
});

// User Interface scene
var UIScene = new Phaser.Class({

    Extends: Phaser.Scene,

    initialize:

    function UIScene ()
    {
        Phaser.Scene.call(this, { key: "UIScene" });
    },

    create: function ()
    {    
        // draw some background for the menu
        this.graphics = this.add.graphics();
        this.graphics.lineStyle(1, 0xffffff);
        this.graphics.fillStyle(0x031f4c, 1);        
        this.graphics.strokeRect(2, 640, 402, 382);
        this.graphics.fillRect(2, 640, 402, 382);
        this.graphics.strokeRect(402, 640, 300, 382);
        this.graphics.fillRect(402, 640, 300, 382);
        this.graphics.strokeRect(702, 640, 576, 382);
        this.graphics.fillRect(702, 640, 576, 382);
        this.hp;

        
        // basic container to hold all menus
        this.menus = this.add.container();
                
        this.heroesMenu = new HeroesMenu(195, 153, this);           
        this.actionsMenu = new ActionsMenu(100, 153, this);            
        this.enemiesMenu = new EnemiesMenu(8, 153, this);   
        
        // the currently selected menu 
        this.currentMenu = this.actionsMenu;
        
        // add menus to the container
        this.menus.add(this.heroesMenu);
        this.menus.add(this.actionsMenu);
        this.menus.add(this.enemiesMenu);

                
        this.battleScene = this.scene.get("BattleScene");                         
        
        // listen for keyboard events
        this.input.keyboard.on("keydown", this.onKeyInput, this);   
        
        // when its player cunit turn to move
        this.battleScene.events.on("PlayerSelect", this.onPlayerSelect, this);
        
        // when the action on the menu is selected
        // for now we have only one action so we dont send and action id
        this.events.on("SelectedAction", this.onSelectedAction, this);
        
        // an enemy is selected
        this.events.on("Enemy", this.onEnemy, this);
        
        // when the scene receives wake event
        this.sys.events.on('wake', this.createMenu, this);
        
        // the message describing the current action
        this.message = new Message(this, this.battleScene.events);
        this.add.existing(this.message);        
        this.createMenu();     
        this.createBattleSprites();
    },
    createMenu: function() {
        // map hero menu items to heroes
        this.remapHeroes();
        // map enemies menu items to enemies
        this.remapEnemies();
        // first move
        this.battleScene.nextTurn(); 
    },
    createBattleSprites: function(){
        //loop through all player sprites and create them
        var incrY = 94; //increment y axis by intervals of 94 
        for (var i = 0; i < players.length; i++){
            if (i === 0){
                //if there is only 1 player
                var player1 = this.add.sprite(1280 - 95, 1024 - 3*95 - 40 + i*93, players[i].unitSprites).setInteractive();

                hp1 = new HealthBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93, players[0].unitStats.hp);
                mp = new MagicBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93 + 24, players[0].unitStats.mp);
                var texthp = this.add.text(980, 1024 - 3*95 - 78 + i*93, "hp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                texthp.setText(players[0].unitStats.hp + "/" + players[0].unitStats.maxHP);
                hptext = new UIHPMP(texthp);
                var textmp = this.add.text(980, 1024 - 3*95 - 78 + i*93 + 24, "mp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                textmp.setText(players[0].unitStats.mp + "/" + players[0].unitStats.maxMP);
                mptext = new UIHPMP(textmp);
                var textName = this.add.text(760, 1024 - 3*95 - 78 + i*93, players[i].unitName,{ color: "#ffa500", align: "center",fontWegight: 
                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});

                for (var j = 0; j < players[i].unitSkills.length; j++){
                    var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
                    console.log(players[i].unitSkills[j].spriteName)
                    skill.setScale(0.9); 
                    skill.on('pointerover', function(pointer){
                        console.log("clicked on skill");
                        this.setTint(0x87ceeb);
                    })
                    skill.on('pointerout', function(pointer){
                        this.clearTint();
                    });
                }


                player1.setScale(0.8);
                player1.on('pointerover', function(pointer){
                    console.log("clicked on player " + players[0].unitName);
                    this.setTint(0x87ceeb);
                });
                player1.on('pointerout', function(pointer){
                    this.clearTint();
                });
            }
            else if (i === 1){
                //if there is only 1 player
                var player2 = this.add.sprite(1280 - 95, 1024 - 3*95 - 40 + i*93, players[i].unitSprites).setInteractive();
                player2.setScale(0.8);
                hp2 = new HealthBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93, players[1].unitStats.hp);
                mp = new MagicBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93 + 24, players[1].unitStats.mp);
                var texthp = this.add.text(980, 1024 - 3*95 - 78 + i*93, "hp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                texthp.setText(players[1].unitStats.hp + "/" + players[1].unitStats.maxHP);
                hptext = new UIHPMP(texthp);
                var textmp = this.add.text(980, 1024 - 3*95 - 78 + i*93 + 24, "mp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                textmp.setText(players[1].unitStats.mp + "/" + players[1].unitStats.maxMP);
                mptext = new UIHPMP(textmp);
                var textName = this.add.text(760, 1024 - 3*95 - 78 + i*93, players[i].unitName,{ color: "#ffa500", align: "center",fontWegight: 
                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});

                for (var j = 0; j < players[i].unitSkills.length; j++){
                    var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
                    console.log(players[j].unitSkills[j].spriteName)
                    skill.setScale(0.9); 
                    skill.on('pointerover', function(pointer){
                        console.log("clicked on skill");
                        this.setTint(0x87ceeb);
                    })
                    skill.on('pointerout', function(pointer){
                        this.clearTint();
                    });
                }
                player2.on('pointerover', function(pointer){
                    console.log("clicked on player " + players[1].unitName);
                    this.setTint(0x87ceeb);
                });
                player2.on('pointerout', function(pointer){
                    this.clearTint();
                });
            }
            else if (i === 2){
                //if there is only 1 player
                var player3 = this.add.sprite(1280 - 95, 1024 - 3*95 - 40 + i*93, players[i].unitSprites).setInteractive();
                player3.setScale(0.8);
                hp3 = new HealthBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93, players[2].unitStats.hp);
                mp = new MagicBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93 + 24, players[2].unitStats.mp);
                var texthp = this.add.text(980, 1024 - 3*95 - 78 + i*93, "hp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                texthp.setText(players[2].unitStats.hp + "/" + players[2].unitStats.maxHP);
                hptext = new UIHPMP(texthp);
                var textmp = this.add.text(980, 1024 - 3*95 - 78 + i*93 + 24, "mp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                textmp.setText(players[2].unitStats.mp + "/" + players[2].unitStats.maxMP);
                mptext = new UIHPMP(textmp);
                var textName = this.add.text(760, 1024 - 3*95 - 78 + i*93, players[i].unitName,{ color: "#ffa500", align: "center",fontWegight: 
                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});

                for (var j = 0; j < players[i].unitSkills.length; j++){
                    var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
                    console.log(players[j].unitSkills[j].spriteName)
                    skill.setScale(0.9); 
                    skill.on('pointerover', function(pointer){
                        console.log("clicked on skill");
                        this.setTint(0x87ceeb);
                    })
                    skill.on('pointerout', function(pointer){
                        this.clearTint();
                    });
                }
                player3.on('pointerover', function(pointer){
                    console.log("clicked on player " + players[2].unitName);
                    this.setTint(0x87ceeb);
                });
                player3.on('pointerout', function(pointer){
                    this.clearTint();
                });
                
            }
            else if (i === 3){
                //if there is only 1 player
                var player4 = this.add.sprite(1280 - 95, 1024 - 3*95 - 40 + i*93, players[i].unitSprites).setInteractive();
                hp4 = new HealthBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93, players[3].unitStats.hp);
                mp = new MagicBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93 + 24, players[3].unitStats.mp);
                var texthp = this.add.text(980, 1024 - 3*95 - 78 + i*93, "hp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                texthp.setText(players[3].unitStats.hp + "/" + players[3].unitStats.maxHP);
                hptext = new UIHPMP(texthp);
                var textmp = this.add.text(980, 1024 - 3*95 - 78 + i*93 + 24, "mp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                textmp.setText(players[3].unitStats.mp + "/" + players[3].unitStats.maxMP);
                mptext = new UIHPMP(textmp);
                var textName = this.add.text(760, 1024 - 3*95 - 78 + i*93, players[i].unitName,{ color: "#ffa500", align: "center",fontWegight: 
                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});

                for (var j = 0; j < players[i].unitSkills.length; j++){
                    var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
                    console.log(players[j].unitSkills[j].spriteName)
                    skill.setScale(0.9); 
                    skill.on('pointerover', function(pointer){
                        console.log("clicked on skill");
                        this.setTint(0x87ceeb);
                    })
                    skill.on('pointerout', function(pointer){
                        this.clearTint();
                    });
                }
                player4.setScale(0.8);
                player4.on('pointerover', function(pointer){
                    console.log("clicked on player " + players[3].unitName);
                    this.setTint(0x87ceeb);
                })
                player4.on('pointerout', function(pointer){
                    this.clearTint();
                });
                
            }
        }

        for (var i = 0; i < enemies.length; i++){
            if (i == 0){
                //if there is only one enemy
                var enemy1 = this.add.sprite(58, 1024-3*95-40 + i * 120, enemies[i].unitSprites).setInteractive();
                hp = new HealthBar(this.scene.get("UIScene"), 158, 1024-3*95-40 + i * 120 - 38, enemies[0].unitStats.hp);
                //enemy_hp_bars.push(hp);
                var textName = this.add.text(20, 1024-3*95-40 + 36 + i * 120, enemies[i].unitName,{ color: "#FF0000",fontWegight: 
                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                for (var j = 0; j < enemies[i].unitSkills.length; j++){
                    var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();
                    console.log(enemies[j].unitSkills[j].spriteName)
                    skill.setScale(0.9); 
                    skill.on('pointerover', function(pointer){
                        console.log("clicked on skill");
                        this.setTint(0x87ceeb);
                    })
                    skill.on('pointerout', function(pointer){
                        this.clearTint();
                    });
                }

                enemy1.setScale(0.8);
                enemy1.on('pointerover', function(pointer){
                    console.log("clicked on enemy " + enemies[0].unitName);
                    this.setTint(0xff0000);
                });
                enemy1.on('pointerout', function(pointer){
                    this.clearTint();
                });
            }
            else if (i === 1){
                var enemy2 = this.add.sprite(58, 1024-3*95-40 + i * 120, enemies[i].unitSprites).setInteractive();
                enemy2.setScale(0.8);
                hp = new HealthBar(this.scene.get("UIScene"), 158, 1024-3*95-40 + i * 120 - 38, enemies[1].unitStats.hp);
                var textName = this.add.text(20, 1024-3*95-40 + 36 + i * 120, enemies[i].unitName,{ color: "#FF0000",fontWegight: 
                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                for (var j = 0; j < enemies[i].unitSkills.length; j++){
                    var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();
                    console.log(enemies[j].unitSkills[j].spriteName)
                    skill.setScale(0.9); 
                    skill.on('pointerover', function(pointer){
                        console.log("clicked on skill");
                        this.setTint(0x87ceeb);
                    })
                    skill.on('pointerout', function(pointer){
                        this.clearTint();
                    });
                }
                enemy2.on('pointerover', function(pointer){
                    console.log("clicked on enemy " + enemies[1].unitName);
                    this.setTint(0xff0000);
                });
                enemy2.on('pointerout', function(pointer){
                    this.clearTint();
                });

            }
            else if (i === 2){
                var enemy3 = this.add.sprite(58, 1024-3*95-40 + i * 120, enemies[i].unitSprites).setInteractive();
                enemy3.setScale(0.8);
                hp = new HealthBar(this.scene.get("UIScene"), 158, 1024-3*95-40 + i * 120 - 38, enemies[2].unitStats.hp);
                var textName = this.add.text(20, 1024-3*95-40 + 36 + i * 120, enemies[i].unitName,{ color: "#FF0000",fontWegight: 
                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                for (var j = 0; j < enemies[i].unitSkills.length; j++){
                    var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();
                    console.log(enemies[j].unitSkills[j].spriteName)
                    skill.setScale(0.9); 
                    skill.on('pointerover', function(pointer){
                        console.log("clicked on skill");
                        this.setTint(0x87ceeb);
                    })
                    skill.on('pointerout', function(pointer){
                        this.clearTint();
                    });
                }
                enemy3.on('pointerover', function(pointer){
                    console.log("clicked on enemy " + enemies[2].unitName);
                    this.setTint(0xff0000);
                });
                enemy3.on('pointerout', function(pointer){
                    this.clearTint();
                });

            }
            else if (i === 3){
                var enemy4 = this.add.sprite(58, 1024-3*95-40 + i * 120, enemies[i].unitSprites).setInteractive();
                enemy4.setScale(0.8);
                hp = new HealthBar(this.scene.get("UIScene"), 158, 1024-3*95-40 + i * 120 - 38, enemies[3].unitStats.hp);
                enemy_hp_bars.push(hp);
                for (var j = 0; j < enemies[i].unitSkills.length; j++){
                    var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();
                    console.log(enemies[j].unitSkills[j].spriteName)
                    skill.setScale(0.9); 
                    skill.on('pointerover', function(pointer){
                        console.log("clicked on skill");
                        this.setTint(0x87ceeb);
                    })
                    skill.on('pointerout', function(pointer){
                        this.clearTint();
                    });
                }
                enemy4.on('pointerover', function(pointer){
                    console.log("clicked on enemy " + enemies[3].unitName);
                    this.setTint(0xff0000);
                })
                enemy4.on('pointerout', function(pointer){
                    this.clearTint();
                });
            }
        }
    },

    displayInfo: function(i){

    },
    
    onEnemy: function(index) {
        // when the enemy is selected, we deselect all menus and send event with the enemy id
        this.heroesMenu.deselect();
        this.actionsMenu.deselect();
        this.enemiesMenu.deselect();
        this.currentMenu = null;
        this.battleScene.receivePlayerSelection("attack", index);   
    },
    onPlayerSelect: function(id) {
        // when its player turn, we select the active hero item and the first action
        // then we make actions menu active
        this.heroesMenu.select(id);
        this.actionsMenu.select(0);
        this.currentMenu = this.actionsMenu;
    },
    // we have action selected and we make the enemies menu active
    // the player needs to choose an enemy to attack
    onSelectedAction: function() {
        this.currentMenu = this.enemiesMenu;
        this.enemiesMenu.select(0);
    },
    remapHeroes: function() {
        var heroes = this.battleScene.heroes;
        this.heroesMenu.remap(heroes);
    },
    remapEnemies: function() {
        var enemies = this.battleScene.enemies;
        this.enemiesMenu.remap(enemies);
    },
    onKeyInput: function(event) {
        if(this.currentMenu && this.currentMenu.selected) {
            if(event.code === "ArrowUp") {
                this.currentMenu.moveSelectionUp();
            } else if(event.code === "ArrowDown") {
                this.currentMenu.moveSelectionDown();
            } else if(event.code === "ArrowRight" || event.code === "Shift") {

            } else if(event.code === "Space" || event.code === "ArrowLeft") {
                this.currentMenu.confirm();
            } 
        }
    },
});

// the message class extends containter 
var Message = new Phaser.Class({

    Extends: Phaser.GameObjects.Container,

    initialize:
    function Message(scene, events) {
        Phaser.GameObjects.Container.call(this, scene, 160, 30);
        var graphics = this.scene.add.graphics();
        this.add(graphics);
        graphics.lineStyle(1, 0xffffff, 0.8);
        graphics.fillStyle(0x031f4c, 0.3);        
        graphics.strokeRect(-90, -15, 180, 30);
        graphics.fillRect(-90, -15, 180, 30);
        this.text = new Phaser.GameObjects.Text(scene, 0, 0, "", { color: "#ffffff", align: "center", fontSize: 13, wordWrap: { width: 170, useAdvancedWrap: true }});
        this.add(this.text);
        this.text.setOrigin(0.5);        
        events.on("Message", this.showMessage, this);
        this.visible = false;
    },
    showMessage: function(text) {
        this.text.setText(text);
        this.visible = true;
        if(this.hideEvent)
            this.hideEvent.remove(false);
        this.hideEvent = this.scene.time.addEvent({ delay: 2000, callback: this.hideMessage, callbackScope: this });
    },
    hideMessage: function() {
        this.hideEvent = null;
        this.visible = false;
    }
});

class HealthBar {

    constructor (scene, x, y, hp)
    {
        this.bar = new Phaser.GameObjects.Graphics(scene);

        this.x = x;
        this.y = y;
        this.value = hp;
        this.p = 76 / 100;
        this.maxHP = hp;
        this.draw();

        scene.add.existing(this.bar);
    }

    decrease (amount)
    {
        this.value -= amount;

        if (this.value < 0)
        {
            this.value = 0;
        }

        this.draw();

        return (this.value === 0);
    }

    draw ()
    {
        this.bar.clear();

        //  BG
        this.bar.fillStyle(0x000000);
        this.bar.fillRect(this.x, this.y, 200, 16);

        //  Health

        this.bar.fillStyle(0xffffff);
        this.bar.fillRect(this.x + 2, this.y + 2, 196, 12);

        if (this.value/this.maxHP < 0.25)
        {
            this.bar.fillStyle(0xff0000);
        }
        else
        {
            this.bar.fillStyle(0x00ff00);
        }

        var d = Math.floor(this.value/this.maxHP) * 2 * 100;

        this.bar.fillRect(this.x + 2, this.y + 2, d, 12);
    }

}

class MagicBar {

    constructor (scene, x, y, hp)
    {
        this.bar = new Phaser.GameObjects.Graphics(scene);

        this.x = x;
        this.y = y;
        this.value = hp;
        this.p = 76 / 100;
        this.maxHP = hp;
        this.draw();

        scene.add.existing(this.bar);
    }

    decrease (amount)
    {
        this.value -= amount;

        if (this.value < 0)
        {
            this.value = 0;
        }

        this.draw();

        return (this.value === 0);
    }

    draw ()
    {
        this.bar.clear();

        //  BG
        this.bar.fillStyle(0x000000);
        this.bar.fillRect(this.x, this.y, 200, 16);

        //  Health

        this.bar.fillStyle(0xffffff);
        this.bar.fillRect(this.x + 2, this.y + 2, 196, 12);
        this.bar.fillStyle(0x00f5ff);
        var d = Math.floor(this.value/this.maxHP) * 2 * 100;

        this.bar.fillRect(this.x + 2, this.y + 2, d, 12);
    }

}

//All the UI information that needs to be kept track of on the current map
/*
keeps track of all the animations currently on the map
keeps track of sprites, which can fade in fade out upon character having used an action
keeps track of he current hp bar of the player
keeps track of the current mp bar of the player
keeps track of the percentage/number of the hp bar of the player
keeps track of the percentage/number of the mp bar of the player
keeps track of the player's battle skills (fades out upon not enough mp)
keeps track of the player's skills (with additional information relating to those skills upon pointerover)
keeps track of the current status effects that gets added or removed
*/
class UIinformation {
    constructor (name, sprites, hp_bar, mp_bar, hp_count, mp_count, battleSkills, skills, status_effects)
    {
        //this.animations = animations;
        this.name = name; //the name of the characer 
        this.sprites = sprites;
        this.hp_bar = hp_bar; //hp bar and mp bars already have their respective classes
        this.mp_bar = mp_bar; //hp bar and mp bars already have their respective classes
        this.hp_count = hp_count;
        this.mp_count = mp_count;
        this.battleSkills = battleSkills;
        this.skills = skills; //don't need class for that, just pass in the skill icon object, shouldn't change
        this.status_effects = status_effects;
    }

}

//Action taken means that the sprite should turn grey/fade upon player taking their action already
//sprites is the sprite object to be taken in
class UIsprites{
    constructor(sprite){
        this.sprite = sprite;
        this.actionTaken = false;
    }

    takenAction(){
        //fades the sprite color
    }

    resetSprites(){
        //resets the sprite colors after the fade 
    }
}

//HP and MP number indicators
class UIHPMP{
    constructor(textObject){
        this.textObject = textObject;
    }

    editText(text){

    }
}

class UIbattleSkills{
    constructor(skillIcon){
        this.skillIcon = skillIcon;
        this.skillAvaliable = true; // All skills are available by default
    }

    skillUnavaliable(){
        //fade in the skill icon.
    }

    skillAvaliable(){
        //makes skills avaliable, regains color
    }
}

//the status effects appear and disappear accordingly
class statusEffect{
    constructor(statusIcon, statusDescription){
        this.statusIcon = statusIcon;
        this.statusDescription = statusDescription;
    }
}

class UIStatusEffect{
    constructor(){
        this.statusActive = []; //the default number of active status effects is 0
    }

    addStatus(status){
        //add a status to the status array
    }

    removeStatus(status){
        //removes a status from the status array
    }

    clearAllStatus(){
        this.statusActive = [];
    }
}












//same but for enemies that do not have mp bar and such
class EnemyUIinformation{
    constructor(name, animations, sprites, hp_bar, hp_count, battleSkills, skills, status_effects){
        this.name = name; //the name of the character 
        this.animations = animations;
        this.sprites = sprites;
        this.hp_bar = hp_bar;
        this.hp_count = hp_count;
        this.battleSkills = battleSkills;
        this.skills = skills;
        this.status_effects = status_effects;
    }
}


