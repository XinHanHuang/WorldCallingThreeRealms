currentPlayer = null;
currentEnemy = null; //keeps track of current player and enemy
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

        menus = ['attack', 'guard', 'skill', 'items','skip','escape'];
        menuBackup = []
        textTurn = ""; //keeps track of the text
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
                var player = new PlayerCharacter(this, 1280-256, 256 + i*130, players[i].unitName, 1, "Warrior", 100, players[i]);
                this.add.existing(player);
                player.anims.play(players[0].unitAnimations[0], true);
                this.heroes.push(player);
            }
            else if (i >= 2){
                var player = new PlayerCharacter(this, 1280-256 - 200, 256 + (i-2)*130 + 50, players[i].unitName, 1, "Warrior", 100, players[i]);
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

        this.createMessageBox();
        
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
            currentPlayer = this.units[this.index];
            //this.events.emit("PlayerSelect", this.index);
            //display current player's information in a message box
            this.updateMessageBox(this.units[this.index].playerInformation.unitName + "'s Turn");

        } else { // else if its enemy unit
            // pick random living hero to be attacked
            var r;
            do {
                r = Math.floor(Math.random() * this.heroes.length);
            } while(!this.heroes[r].living) 
            this.updateMessageBox(this.units[this.index].playerInformation.unitName + "'s Turn");
            // call the enemy's attack function 
            this.units[this.index].attack(this.heroes[r]);  
            // add timer for the next turn, so will have smooth gameplay
            this.time.addEvent({ delay: 3000, callback: this.nextTurn, callbackScope: this });
        }
    },     
    createMessageBox: function(){
        var graphics = this.scene.get("BattleScene").add.graphics();
        graphics.lineStyle(1, 0xffffff, 0.8);
        graphics.fillStyle(0x000000, 0.3);        
        graphics.strokeRect(1280/2 - 220, 1024/2 + 60, 300, 60);
        graphics.fillRect(1280/2 - 220, 1024/2 + 60, 300, 60);

        var text = this.scene.get("BattleScene").add.text(1280/2 - 140, 
            1024/2 + 60, "dd", { color: "#000000", align: "center", fontWegight: 
            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
        this.scene.get("BattleScene").textTurn = text;

    },
    updateMessageBox: function(updatedText){
        this.scene.get("BattleScene").textTurn.setText(updatedText);
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
        enemies.length = 0;
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

    function Unit(scene, x, y, texture, frame, type, hp, playerInformation) {
        Phaser.GameObjects.Sprite.call(this, scene, x, y, texture, frame)
        this.type = type;
        this.maxHp = this.hp = hp;
        this.living = true;         
        this.menuItem = null;
        this.playerInformation = playerInformation;

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
        this.hp-=damage;
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

        

                
        this.battleScene = this.scene.get("BattleScene");                         
        
        
        // when the scene receives wake event
        this.sys.events.on('wake', this.createMenu, this);
        
        // the message describing the current action
        this.message = new Message(this, this.battleScene.events);
        this.add.existing(this.message);        
        this.createMenu();     
        this.createBattleSprites();
        this.createMenuOptions();
    },
    createMenu: function() {
        // first move
        this.battleScene.nextTurn(); 
    },
    createMenuOptions: function() {
        //this method creates the main menu functionalies
        //right now I'll just have image place holders in place
        var enemyTexts = [];
        for (var i = 0; i < 6; i++){
            if (menus[i] === "attack"){
                var temp = this.add.sprite(560, 1024 - 3*95 - 58 + i*60, menus[i]).setInteractive();
                temp.setScale(0.25);
                temp.on('pointerdown', (pointer)=>{
                    temp.setTint(0x87ceeb);
                    //alert(currentPlayer.playerInformation.unitName);
                    for (var i = 0; i < menuBackup.length; i++){
                        menuBackup[i].setActive(false).setVisible(false);
                    }
                    for (var i = 0; i < enemies.length + 1; i++){
                        if(i === enemies.length){
                            //if this is the last index, create an escape button
                            var escapetext1 = this.add.text(410, 1024 - 3*95 - 58 + i*80, "BACK",{ color: "#ffa500", align: "center",fontWegight: 
                            'bold',font: '36px Arial', wordWrap: { width: 320, useAdvancedWrap: true }}).setInteractive();
                            escapetext1.on('pointerdown', (pointer)=>{
                                for (var i = 0; i < enemyTexts.length; i++){
                                    enemyTexts[i].destroy();
                                }
                                for (var i = 0; i < menuBackup.length; i++){
                                    menuBackup[i].setActive(true).setVisible(true);
                                }
                            });
                            enemyTexts.push(escapetext1);
                        }
                        else if (i === 0){
                            var enemytext1 = this.add.text(410, 1024 - 3*95 - 58 + i*80, enemies[i].unitName,{ color: "#ffa500", align: "center",fontWegight: 
                            'bold',font: '36px Arial', wordWrap: { width: 320, useAdvancedWrap: true }}).setInteractive();
                            enemytext1.on('pointerdown', (pointer)=>{
                                this.battle(currentPlayer.playerInformation, enemies[0], "attack");
                                for (var i = 0; i < enemyTexts.length; i++){
                                    enemyTexts[i].destroy();
                                }
                                for (var i = 0; i < menuBackup.length; i++){
                                    menuBackup[i].setActive(true).setVisible(true);
                                }
                            });
                            enemyTexts.push(enemytext1);
                        }
                        else if (i === 1){
                            var enemytext2 = this.add.text(410, 1024 - 3*95 - 58 + i*80, enemies[i].unitName,{ color: "#ffa500", align: "center",fontWegight: 
                            'bold',font: '36px Arial', wordWrap: { width: 320, useAdvancedWrap: true }}).setInteractive();
                            enemytext2.on('pointerdown', (pointer)=>{
                                this.battle(currentPlayer.playerInformation, enemies[1], "attack");
                                for (var i = 0; i < enemyTexts.length; i++){
                                    enemyTexts[i].destroy();
                                }
                                for (var i = 0; i < menuBackup.length; i++){
                                    menuBackup[i].setActive(true).setVisible(true);
                                }
                            });
                            enemyTexts.push(enemytext2);
                        }
                        else if (i === 2){
                            var enemytext3 = this.add.text(410, 1024 - 3*95 - 58 + i*80, enemies[i].unitName,{ color: "#ffa500", align: "center",fontWegight: 
                            'bold',font: '36px Arial', wordWrap: { width: 320, useAdvancedWrap: true }}).setInteractive();
                            enemytext3.on('pointerdown', (pointer)=>{
                                this.battle(currentPlayer.playerInformation, enemies[2], "attack");
                                for (var i = 0; i < enemyTexts.length; i++){
                                    enemyTexts[i].destroy();
                                }
                                for (var i = 0; i < menuBackup.length; i++){
                                    menuBackup[i].setActive(true).setVisible(true);
                                }
                            });
                            enemyTexts.push(enemytext3);
                        }
                    }
                })
                temp.on('pointerout', function(pointer){
                    this.clearTint();
                });
                menuBackup.push(temp);
            }
            if (menus[i] === "guard"){
                var temp = this.add.sprite(560, 1024 - 3*95 - 58 + i*60, menus[i]).setInteractive();
                temp.setScale(0.25);
                temp.on('pointerdown', function(pointer){

                    //alert(currentPlayer.playerInformation.unitName);
                })
                temp.on('pointerout', function(pointer){
                    this.clearTint();
                });
                menuBackup.push(temp);
            }
            if (menus[i] === "skill"){
                var temp = this.add.sprite(560, 1024 - 3*95 - 58 + i*60, menus[i]).setInteractive();
                temp.setScale(0.25);
                temp.on('pointerdown', function(pointer){

                    //alert(currentPlayer.playerInformation.unitName);
                })
                temp.on('pointerout', function(pointer){
                    this.clearTint();
                });
                menuBackup.push(temp);
            }
            if (menus[i] === "items"){
                var temp = this.add.sprite(560, 1024 - 3*95 - 58 + i*60, menus[i]).setInteractive();
                temp.setScale(0.25);
                temp.on('pointerdown', function(pointer){

                    //alert(currentPlayer.playerInformation.unitName);
                })
                temp.on('pointerout', function(pointer){
                    this.clearTint();
                });
                menuBackup.push(temp);
            }
            if (menus[i] === "skip"){
                var temp = this.add.sprite(560, 1024 - 3*95 - 58 + i*60, menus[i]).setInteractive();
                temp.setScale(0.25);
                temp.on('pointerdown', function(pointer){

                    //alert(currentPlayer.playerInformation.unitName);
                })
                temp.on('pointerout', function(pointer){
                    this.clearTint();
                });
                menuBackup.push(temp);
            }
            if (menus[i] === "escape"){
                var temp = this.add.sprite(560, 1024 - 3*95 - 58 + i*60, menus[i]).setInteractive();
                temp.setScale(0.25);
                temp.on('pointerdown', function(pointer){
                    //alert(currentPlayer.playerInformation.unitName);
                })
                temp.on('pointerout', function(pointer){
                    this.clearTint();
                });
                menuBackup.push(temp);
            }
        }  
    },
    battle: function(player, target, method_of_attack){
        //simple attack
        if (method_of_attack === "attack"){
            this.scene.get("BattleScene").updateMessageBox(player.unitName + " attacks " + target.unitName);
        }
    },
    createBattleSprites: function(){
        //loop through all player sprites and create them
        var incrY = 94; //increment y axis by intervals of 94 
        for (var i = 0; i < players.length; i++){
            if (i === 0){
                //if there is only 1 player
                var player1 = this.add.sprite(1280 - 95, 1024 - 3*95 - 40 + i*93, players[i].unitSprites).setInteractive();

                hp1 = new HealthBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93, players[0].unitStats.hp);
                mp1 = new MagicBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93 + 24, players[0].unitStats.mp);
                var texthp1 = this.add.text(980, 1024 - 3*95 - 78 + i*93, "hp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                texthp1.setText(players[0].unitStats.hp + "/" + players[0].unitStats.maxHP);
                hptext1 = new UIHPMP(texthp1);
                var textmp1 = this.add.text(980, 1024 - 3*95 - 78 + i*93 + 24, "mp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                textmp1.setText(players[0].unitStats.mp + "/" + players[0].unitStats.maxMP);
                mptext1 = new UIHPMP(textmp1);
                var textName = this.add.text(760, 1024 - 3*95 - 78 + i*93, players[i].unitName,{ color: "#ffa500", align: "center",fontWegight: 
                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});

                for (var j = 0; j < players[i].unitSkills.length; j++){
                    if(j === 0){
                    var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
                    
                    var graphics = this.scene.get("UIScene").add.graphics();
                    graphics.lineStyle(1, 0xffffff, 0.8);
                    graphics.fillStyle(0x000000, 1);        
                    graphics.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                    graphics.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                    graphics.visible = false;

                    var text = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                        1024 - 3*95 - 236 + i*93, players[i].unitSkills[0].skillName +
                        ": " + players[i].unitSkills[0].description, { color: "#ff2f2f", align: "center", fontWegight: 
                        'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                    text.visible = false;
                    

                    skill.setScale(0.9); 
                    skill.on('pointerover', function(pointer){
                        console.log("clicked on skill");
                        this.setTint(0x87ceeb);
                        text.visible = true;
                        graphics.visible = true;
                    })
                    skill.on('pointerout', function(pointer){
                        this.clearTint();
                        text.visible = false;
                        graphics.visible = false;
                        
                    });
                    }
                    if (j === 1){
                        var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();

                        var graphics1 = this.scene.get("UIScene").add.graphics();
                        graphics1.lineStyle(1, 0xffffff, 0.8);
                        graphics1.fillStyle(0x000000, 1);        
                        graphics1.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                        graphics1.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                        graphics1.visible = false;

                        var text1 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                            1024 - 3*95 - 236 + i*93, players[i].unitSkills[1].skillName +
                            ": " + players[i].unitSkills[1].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text1.visible = false;
    
                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            this.setTint(0x87ceeb);
                            text1.visible = true;
                            graphics1.visible = true;
                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            text1.visible = false;
                            graphics1.visible = false;
                        });
                    }
                    if (j === 2){
                        var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();

                        var graphics2 = this.scene.get("UIScene").add.graphics();
                        graphics2.lineStyle(1, 0xffffff, 0.8);
                        graphics2.fillStyle(0x000000, 1);        
                        graphics2.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                        graphics2.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                        graphics2.visible = false;

                        var text2 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                            1024 - 3*95 - 236 + i*93, players[i].unitSkills[2].skillName +
                            ": " + players[i].unitSkills[2].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text2.visible = false;
    
                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            this.setTint(0x87ceeb);
                            text2.visible = true;
                            graphics2.visible = true;
                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            text2.visible = false;
                            graphics2.visible = false;
                        });
                    }
                    if (j === 3){
                        var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();

                        var graphics3 = this.scene.get("UIScene").add.graphics();
                        graphics3.lineStyle(1, 0xffffff, 0.8);
                        graphics3.fillStyle(0x000000, 1);        
                        graphics3.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                        graphics3.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                        graphics3.visible = false;

                        var text3 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                            1024 - 3*95 - 236 + i*93, players[i].unitSkills[3].skillName +
                            ": " + players[i].unitSkills[3].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text3.visible = false;
    
                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            this.setTint(0x87ceeb);
                            text3.visible = true;
                            graphics3.visible = true;
                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            text3.visible = false;
                            graphics3.visible = false;
                        });
                    }
                    if (j === 4){
                        var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();

                        var graphics4 = this.scene.get("UIScene").add.graphics();
                        graphics4.lineStyle(1, 0xffffff, 0.8);
                        graphics4.fillStyle(0x000000, 1);        
                        graphics4.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                        graphics4.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                        graphics4.visible = false;

                        var text4 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                            1024 - 3*95 - 236 + i*93, players[i].unitSkills[4].skillName +
                            ": " + players[i].unitSkills[4].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text4.visible = false;
    
                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            this.setTint(0x87ceeb);
                            text4.visible = true;
                            graphics4.visible = true;
                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            text4.visible = false;
                            graphics4.visible = false;
                        });
                    }
                }

                //create the information display pannel
                var spritegraphics = this.scene.get("UIScene").add.graphics();
                spritegraphics.lineStyle(1, 0xffffff, 0.8);
                spritegraphics.fillStyle(0x000000, 1);
                spritegraphics.strokeRect(1280 - 300, 1024 - 3*95 - 340 + i*93, 180, 280);
                spritegraphics.fillRect(1280 - 300, 1024 - 3*95 - 340 + i*93, 180, 280);
                spritegraphics.visible = false;
                var textsprite= this.scene.get("UIScene").add.text(1280 - 265, 
                    1024 - 3*95 - 340 + i*93, players[0].unitName + "\n" + 
                    "HP: " + players[0].unitStats.hp + "/" + players[0].unitStats.maxHP + "\n" +
                    "MP: " + players[0].unitStats.mp + "/" + players[0].unitStats.maxMP + "\n" +
                    "ATK: " + players[0].unitStats.atk + "\n" +
                    "DEF: " + players[0].unitStats.def + "\n" +
                    "RES: " + players[0].unitStats.res + "\n" +
                    "SPD: " + players[0].unitStats.spd + "\n" +
                    "LUCK: " + players[0].unitStats.luck, { color: "#ff2f2f", align: "center", fontWegight: 
                    'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                textsprite.visible = false;

                player1.setScale(0.8);
                player1.on('pointerover', function(pointer){
                    console.log("clicked on player " + players[0].unitName);
                    this.setTint(0x87ceeb);
                    spritegraphics.visible = true;
                    textsprite.visible = true;
                });
                player1.on('pointerout', function(pointer){
                    this.clearTint();
                    spritegraphics.visible = false;
                    textsprite.visible = false;
                });

                playerUI1 = new UIinformation(players[i].unitName, player1, hp1, mp1, players[i].unitBattleSkills,
                    players[i].unitSkills, null, hptext1, mptext1);
                UIarray.push(playerUI1);


            }
            else if (i === 1){
                //if there is only 1 player
                var player2 = this.add.sprite(1280 - 95, 1024 - 3*95 - 40 + i*93, players[i].unitSprites).setInteractive();
                player2.setScale(0.8);
                hp2 = new HealthBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93, players[1].unitStats.hp);
                mp2 = new MagicBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93 + 24, players[1].unitStats.mp);
                var texthp2 = this.add.text(980, 1024 - 3*95 - 78 + i*93, "hp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                texthp2.setText(players[1].unitStats.hp + "/" + players[1].unitStats.maxHP);
                hptext2 = new UIHPMP(texthp2);
                var textmp2 = this.add.text(980, 1024 - 3*95 - 78 + i*93 + 24, "mp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                textmp2.setText(players[1].unitStats.mp + "/" + players[1].unitStats.maxMP);
                mptext2 = new UIHPMP(textmp2);
                var textName2 = this.add.text(760, 1024 - 3*95 - 78 + i*93, players[i].unitName,{ color: "#ffa500", align: "center",fontWegight: 
                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});

                for (var j = 0; j < players[i].unitSkills.length; j++){
                    if(j === 0){
                        var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
                        
                        var graphics5 = this.scene.get("UIScene").add.graphics();
                        graphics5.lineStyle(1, 0xffffff, 0.8);
                        graphics5.fillStyle(0x000000, 1);        
                        graphics5.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                        graphics5.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                        graphics5.visible = false;
    
                        var text5 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                            1024 - 3*95 - 236 + i*93, players[i].unitSkills[0].skillName +
                            ": " + players[i].unitSkills[0].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text5.visible = false;
                        
    
                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            this.setTint(0x87ceeb);
                            text5.visible = true;
                            graphics5.visible = true;
                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            text5.visible = false;
                            graphics5.visible = false;
                            
                        });
                        }
                        if (j === 1){
                            var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
    
                            var graphics6 = this.scene.get("UIScene").add.graphics();
                            graphics6.lineStyle(1, 0xffffff, 0.8);
                            graphics6.fillStyle(0x000000, 1);        
                            graphics6.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics6.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics6.visible = false;
    
                            var text6 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                                1024 - 3*95 - 236 + i*93, players[i].unitSkills[1].skillName +
                                ": " + players[i].unitSkills[1].description, { color: "#ff2f2f", align: "center", fontWegight: 
                                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                            text6.visible = false;
        
                            skill.setScale(0.9); 
                            skill.on('pointerover', function(pointer){
                                console.log("clicked on skill");
                                this.setTint(0x87ceeb);
                                text6.visible = true;
                                graphics6.visible = true;
                            })
                            skill.on('pointerout', function(pointer){
                                this.clearTint();
                                text6.visible = false;
                                graphics6.visible = false;
                            });
                        }
                        if (j === 2){
                            var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
    
                            var graphics7 = this.scene.get("UIScene").add.graphics();
                            graphics7.lineStyle(1, 0xffffff, 0.8);
                            graphics7.fillStyle(0x000000, 1);        
                            graphics7.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics7.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics7.visible = false;
    
                            var text7 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                                1024 - 3*95 - 236 + i*93, players[i].unitSkills[2].skillName +
                                ": " + players[i].unitSkills[2].description, { color: "#ff2f2f", align: "center", fontWegight: 
                                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                            text7.visible = false;
        
                            skill.setScale(0.9); 
                            skill.on('pointerover', function(pointer){
                                console.log("clicked on skill");
                                this.setTint(0x87ceeb);
                                text7.visible = true;
                                graphics7.visible = true;
                            })
                            skill.on('pointerout', function(pointer){
                                this.clearTint();
                                text7.visible = false;
                                graphics7.visible = false;
                            });
                        }
                        if (j === 3){
                            var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
    
                            var graphics8 = this.scene.get("UIScene").add.graphics();
                            graphics8.lineStyle(1, 0xffffff, 0.8);
                            graphics8.fillStyle(0x000000, 1);        
                            graphics8.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics8.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics8.visible = false;
    
                            var text8 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                                1024 - 3*95 - 236 + i*93, players[i].unitSkills[3].skillName +
                                ": " + players[i].unitSkills[3].description, { color: "#ff2f2f", align: "center", fontWegight: 
                                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                            text8.visible = false;
        
                            skill.setScale(0.9); 
                            skill.on('pointerover', function(pointer){
                                console.log("clicked on skill");
                                this.setTint(0x87ceeb);
                                text8.visible = true;
                                graphics8.visible = true;
                            })
                            skill.on('pointerout', function(pointer){
                                this.clearTint();
                                text8.visible = false;
                                graphics8.visible = false;
                            });
                        }
                        if (j === 4){
                            var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
    
                            var graphics9 = this.scene.get("UIScene").add.graphics();
                            graphics9.lineStyle(1, 0xffffff, 0.8);
                            graphics9.fillStyle(0x000000, 1);        
                            graphics9.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics9.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics9.visible = false;
    
                            var text9 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                                1024 - 3*95 - 236 + i*93, players[i].unitSkills[4].skillName +
                                ": " + players[i].unitSkills[4].description, { color: "#ff2f2f", align: "center", fontWegight: 
                                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                            text9.visible = false;
        
                            skill.setScale(0.9); 
                            skill.on('pointerover', function(pointer){
                                console.log("clicked on skill");
                                this.setTint(0x87ceeb);
                                text9.visible = true;
                                graphics9.visible = true;
                            })
                            skill.on('pointerout', function(pointer){
                                this.clearTint();
                                text9.visible = false;
                                graphics9.visible = false;
                            });
                        }
                }
                //create the information display pannel
                var spritegraphics2 = this.scene.get("UIScene").add.graphics();
                spritegraphics2.lineStyle(1, 0xffffff, 0.8);
                spritegraphics2.fillStyle(0x000000, 1);
                spritegraphics2.strokeRect(1280 - 300, 1024 - 3*95 - 340 + i*93, 180, 280);
                spritegraphics2.fillRect(1280 - 300, 1024 - 3*95 - 340 + i*93, 180, 280);
                spritegraphics2.visible = false;
                var textsprite2= this.scene.get("UIScene").add.text(1280 - 265, 
                    1024 - 3*95 - 340 + i*93, players[1].unitName + "\n" + 
                    "HP: " + players[1].unitStats.hp + "/" + players[1].unitStats.maxHP + "\n" +
                    "MP: " + players[1].unitStats.mp + "/" + players[1].unitStats.maxMP + "\n" +
                    "ATK: " + players[1].unitStats.atk + "\n" +
                    "DEF: " + players[1].unitStats.def + "\n" +
                    "RES: " + players[1].unitStats.res + "\n" +
                    "SPD: " + players[1].unitStats.spd + "\n" +
                    "LUCK: " + players[1].unitStats.luck, { color: "#ff2f2f", align: "center", fontWegight: 
                    'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                textsprite2.visible = false;

                player2.on('pointerover', function(pointer){
                    this.setTint(0x87ceeb);
                    spritegraphics2.visible = true;
                    textsprite2.visible = true;
                });
                player2.on('pointerout', function(pointer){
                    this.clearTint();
                    spritegraphics2.visible = false;
                    textsprite2.visible = false;
                });
                playerUI2 = new UIinformation(players[i].unitName, player2, hp2, mp2, players[i].unitBattleSkills,
                    players[i].unitSkills, null, hptext2, mptext2);
                UIarray.push(playerUI2);

            }
            else if (i === 2){
                //if there is only 1 player
                var player3 = this.add.sprite(1280 - 95, 1024 - 3*95 - 40 + i*93, players[i].unitSprites).setInteractive();
                player3.setScale(0.8);
                hp3 = new HealthBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93, players[2].unitStats.hp);
                mp3 = new MagicBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93 + 24, players[2].unitStats.mp);
                var texthp3 = this.add.text(980, 1024 - 3*95 - 78 + i*93, "hp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                texthp3.setText(players[2].unitStats.hp + "/" + players[2].unitStats.maxHP);
                hptext3 = new UIHPMP(texthp3);
                var textmp3 = this.add.text(980, 1024 - 3*95 - 78 + i*93 + 24, "mp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                textmp3.setText(players[2].unitStats.mp + "/" + players[2].unitStats.maxMP);
                mptext3 = new UIHPMP(textmp3);
                var textName3 = this.add.text(760, 1024 - 3*95 - 78 + i*93, players[i].unitName,{ color: "#ffa500", align: "center",fontWegight: 
                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});

                for (var j = 0; j < players[i].unitSkills.length; j++){
                    if(j === 0){
                        var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
                        
                        var graphics10 = this.scene.get("UIScene").add.graphics();
                        graphics10.lineStyle(1, 0xffffff, 0.8);
                        graphics10.fillStyle(0x000000, 1);        
                        graphics10.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                        graphics10.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                        graphics10.visible = false;
    
                        var text10 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                            1024 - 3*95 - 236 + i*93, players[i].unitSkills[0].skillName +
                            ": " + players[i].unitSkills[0].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text10.visible = false;
                        
    
                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            this.setTint(0x87ceeb);
                            text10.visible = true;
                            graphics10.visible = true;
                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            text10.visible = false;
                            graphics10.visible = false;
                            
                        });
                        }
                        if (j === 1){
                            var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
    
                            var graphics11 = this.scene.get("UIScene").add.graphics();
                            graphics11.lineStyle(1, 0xffffff, 0.8);
                            graphics11.fillStyle(0x000000, 1);        
                            graphics11.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics11.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics11.visible = false;
    
                            var text11 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                                1024 - 3*95 - 236 + i*93, players[i].unitSkills[1].skillName +
                                ": " + players[i].unitSkills[1].description, { color: "#ff2f2f", align: "center", fontWegight: 
                                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                            text11.visible = false;
        
                            skill.setScale(0.9); 
                            skill.on('pointerover', function(pointer){
                                console.log("clicked on skill");
                                this.setTint(0x87ceeb);
                                text11.visible = true;
                                graphics11.visible = true;
                            })
                            skill.on('pointerout', function(pointer){
                                this.clearTint();
                                text11.visible = false;
                                graphics11.visible = false;
                            });
                        }
                        if (j === 2){
                            var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
    
                            var graphics12 = this.scene.get("UIScene").add.graphics();
                            graphics12.lineStyle(1, 0xffffff, 0.8);
                            graphics12.fillStyle(0x000000, 1);        
                            graphics12.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics12.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics12.visible = false;
    
                            var text12 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                                1024 - 3*95 - 236 + i*93, players[i].unitSkills[2].skillName +
                                ": " + players[i].unitSkills[2].description, { color: "#ff2f2f", align: "center", fontWegight: 
                                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                            text12.visible = false;
        
                            skill.setScale(0.9); 
                            skill.on('pointerover', function(pointer){
                                console.log("clicked on skill");
                                this.setTint(0x87ceeb);
                                text12.visible = true;
                                graphics12.visible = true;
                            })
                            skill.on('pointerout', function(pointer){
                                this.clearTint();
                                text12.visible = false;
                                graphics12.visible = false;
                            });
                        }
                        if (j === 3){
                            var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
    
                            var graphics13 = this.scene.get("UIScene").add.graphics();
                            graphics13.lineStyle(1, 0xffffff, 0.8);
                            graphics13.fillStyle(0x000000, 1);        
                            graphics13.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics13.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics13.visible = false;
    
                            var text13 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                                1024 - 3*95 - 236 + i*93, players[i].unitSkills[3].skillName +
                                ": " + players[i].unitSkills[3].description, { color: "#ff2f2f", align: "center", fontWegight: 
                                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                            text13.visible = false;
        
                            skill.setScale(0.9); 
                            skill.on('pointerover', function(pointer){
                                console.log("clicked on skill");
                                this.setTint(0x87ceeb);
                                text13.visible = true;
                                graphics13.visible = true;
                            })
                            skill.on('pointerout', function(pointer){
                                this.clearTint();
                                text13.visible = false;
                                graphics13.visible = false;
                            });
                        }
                        if (j === 4){
                            var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
    
                            var graphics14 = this.scene.get("UIScene").add.graphics();
                            graphics14.lineStyle(1, 0xffffff, 0.8);
                            graphics14.fillStyle(0x000000, 1);        
                            graphics14.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics14.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics14.visible = false;
    
                            var text14 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                                1024 - 3*95 - 236 + i*93, players[i].unitSkills[4].skillName +
                                ": " + players[i].unitSkills[4].description, { color: "#ff2f2f", align: "center", fontWegight: 
                                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                            text14.visible = false;
        
                            skill.setScale(0.9); 
                            skill.on('pointerover', function(pointer){
                                console.log("clicked on skill");
                                this.setTint(0x87ceeb);
                                text14.visible = true;
                                graphics14.visible = true;
                            })
                            skill.on('pointerout', function(pointer){
                                this.clearTint();
                                text14.visible = false;
                                graphics14.visible = false;
                            });
                        }
                }
                //create the information display pannel
                var spritegraphics3 = this.scene.get("UIScene").add.graphics();
                spritegraphics3.lineStyle(1, 0xffffff, 0.8);
                spritegraphics3.fillStyle(0x000000, 1);
                spritegraphics3.strokeRect(1280 - 300, 1024 - 3*95 - 340 + i*93, 180, 280);
                spritegraphics3.fillRect(1280 - 300, 1024 - 3*95 - 340 + i*93, 180, 280);
                spritegraphics3.visible = false;
                var textsprite3= this.scene.get("UIScene").add.text(1280 - 265, 
                    1024 - 3*95 - 340 + i*93, players[2].unitName + "\n" + 
                    "HP: " + players[2].unitStats.hp + "/" + players[2].unitStats.maxHP + "\n" +
                    "MP: " + players[2].unitStats.mp + "/" + players[2].unitStats.maxMP + "\n" +
                    "ATK: " + players[2].unitStats.atk + "\n" +
                    "DEF: " + players[2].unitStats.def + "\n" +
                    "RES: " + players[2].unitStats.res + "\n" +
                    "SPD: " + players[2].unitStats.spd + "\n" +
                    "LUCK: " + players[2].unitStats.luck, { color: "#ff2f2f", align: "center", fontWegight: 
                    'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                textsprite3.visible = false;
                player3.on('pointerover', function(pointer){
                    this.setTint(0x87ceeb);
                    spritegraphics3.visible = true;
                    textsprite3.visible = true;
                });
                player3.on('pointerout', function(pointer){
                    this.clearTint();
                    spritegraphics3.visible = false;
                    textsprite3.visible = false;
                });

                playerUI3 = new UIinformation(players[i].unitName, player3, hp3, mp3, players[i].unitBattleSkills,
                    players[i].unitSkills, null, hptext3, mptext3);
                UIarray.push(playerUI3);
                
            }
            else if (i === 3){
                //if there is only 1 player
                var player4 = this.add.sprite(1280 - 95, 1024 - 3*95 - 40 + i*93, players[i].unitSprites).setInteractive();
                hp4 = new HealthBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93, players[3].unitStats.hp);
                mp4 = new MagicBar(this.scene.get("UIScene"), 1280 - 95*4, 1024 - 3*95 - 78 + i*93 + 24, players[3].unitStats.mp);
                var texthp4 = this.add.text(980, 1024 - 3*95 - 78 + i*93, "hp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                texthp4.setText(players[3].unitStats.hp + "/" + players[3].unitStats.maxHP);
                hptext4 = new UIHPMP(texthp4);
                var textmp4 = this.add.text(980, 1024 - 3*95 - 78 + i*93 + 24, "mp_player1",{ color: "#000000", align: "center",fontWegight: 
                'bold',font: '13px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                textmp4.setText(players[3].unitStats.mp + "/" + players[3].unitStats.maxMP);
                mptext4 = new UIHPMP(textmp4);
                var textName4 = this.add.text(760, 1024 - 3*95 - 78 + i*93, players[i].unitName,{ color: "#ffa500", align: "center",fontWegight: 
                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});

                for (var j = 0; j < players[i].unitSkills.length; j++){
                    if(j === 0){
                        var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
                        
                        var graphics15 = this.scene.get("UIScene").add.graphics();
                        graphics15.lineStyle(1, 0xffffff, 0.8);
                        graphics15.fillStyle(0x000000, 1);        
                        graphics15.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                        graphics15.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                        graphics15.visible = false;
    
                        var text15 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                            1024 - 3*95 - 236 + i*93, players[i].unitSkills[0].skillName +
                            ": " + players[i].unitSkills[0].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text15.visible = false;
                        
    
                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            this.setTint(0x87ceeb);
                            text15.visible = true;
                            graphics15.visible = true;
                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            text15.visible = false;
                            graphics15.visible = false;
                            
                        });
                        }
                        if (j === 1){
                            var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
    
                            var graphics16 = this.scene.get("UIScene").add.graphics();
                            graphics16.lineStyle(1, 0xffffff, 0.8);
                            graphics16.fillStyle(0x000000, 1);        
                            graphics16.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics16.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics16.visible = false;
    
                            var text16 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                                1024 - 3*95 - 236 + i*93, players[i].unitSkills[1].skillName +
                                ": " + players[i].unitSkills[1].description, { color: "#ff2f2f", align: "center", fontWegight: 
                                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                            text16.visible = false;
        
                            skill.setScale(0.9); 
                            skill.on('pointerover', function(pointer){
                                console.log("clicked on skill");
                                this.setTint(0x87ceeb);
                                text16.visible = true;
                                graphics16.visible = true;
                            })
                            skill.on('pointerout', function(pointer){
                                this.clearTint();
                                text16.visible = false;
                                graphics16.visible = false;
                            });
                        }
                        if (j === 2){
                            var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
    
                            var graphics17 = this.scene.get("UIScene").add.graphics();
                            graphics17.lineStyle(1, 0xffffff, 0.8);
                            graphics17.fillStyle(0x000000, 1);        
                            graphics17.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics17.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics17.visible = false;
    
                            var text17 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                                1024 - 3*95 - 236 + i*93, players[i].unitSkills[2].skillName +
                                ": " + players[i].unitSkills[2].description, { color: "#ff2f2f", align: "center", fontWegight: 
                                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                            text17.visible = false;
        
                            skill.setScale(0.9); 
                            skill.on('pointerover', function(pointer){
                                console.log("clicked on skill");
                                this.setTint(0x87ceeb);
                                text17.visible = true;
                                graphics17.visible = true;
                            })
                            skill.on('pointerout', function(pointer){
                                this.clearTint();
                                text17.visible = false;
                                graphics17.visible = false;
                            });
                        }
                        if (j === 3){
                            var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
    
                            var graphics18 = this.scene.get("UIScene").add.graphics();
                            graphics18.lineStyle(1, 0xffffff, 0.8);
                            graphics18.fillStyle(0x000000, 1);        
                            graphics18.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics18.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics18.visible = false;
    
                            var text18 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                                1024 - 3*95 - 236 + i*93, players[i].unitSkills[3].skillName +
                                ": " + players[i].unitSkills[3].description, { color: "#ff2f2f", align: "center", fontWegight: 
                                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                            text18.visible = false;
        
                            skill.setScale(0.9); 
                            skill.on('pointerover', function(pointer){
                                console.log("clicked on skill");
                                this.setTint(0x87ceeb);
                                text18.visible = true;
                                graphics18.visible = true;
                            })
                            skill.on('pointerout', function(pointer){
                                this.clearTint();
                                text18.visible = false;
                                graphics18.visible = false;
                            });
                        }
                        if (j === 4){
                            var skill = this.add.sprite(1280 - 192 - j*36, 1024 - 3*95 - 78 + 60 + i*93, players[i].unitSkills[j].spriteName).setInteractive();
    
                            var graphics19 = this.scene.get("UIScene").add.graphics();
                            graphics19.lineStyle(1, 0xffffff, 0.8);
                            graphics19.fillStyle(0x000000, 1);        
                            graphics19.strokeRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics19.fillRect(1280 - 406 - j*36 + 30, 1024 - 3*95 - 236 + i*93, 180, 200);
                            graphics19.visible = false;
    
                            var text19 = this.scene.get("UIScene").add.text(1280 - 392 - j*36 + 30, 
                                1024 - 3*95 - 236 + i*93, players[i].unitSkills[4].skillName +
                                ": " + players[i].unitSkills[4].description, { color: "#ff2f2f", align: "center", fontWegight: 
                                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                            text19.visible = false;
        
                            skill.setScale(0.9); 
                            skill.on('pointerover', function(pointer){
                                console.log("clicked on skill");
                                this.setTint(0x87ceeb);
                                text19.visible = true;
                                graphics19.visible = true;
                            })
                            skill.on('pointerout', function(pointer){
                                this.clearTint();
                                text19.visible = false;
                                graphics19.visible = false;
                            });
                        }
                }
                //create the information display pannel
                var spritegraphics4 = this.scene.get("UIScene").add.graphics();
                spritegraphics4.lineStyle(1, 0xffffff, 0.8);
                spritegraphics4.fillStyle(0x000000, 1);
                spritegraphics4.strokeRect(1280 - 300, 1024 - 3*95 - 340 + i*93, 180, 280);
                spritegraphics4.fillRect(1280 - 300, 1024 - 3*95 - 340 + i*93, 180, 280);
                spritegraphics4.visible = false;
                var textsprite4= this.scene.get("UIScene").add.text(1280 - 265, 
                    1024 - 3*95 - 340 + i*93, players[3].unitName + "\n" + 
                    "HP: " + players[3].unitStats.hp + "/" + players[3].unitStats.maxHP + "\n" +
                    "MP: " + players[3].unitStats.mp + "/" + players[3].unitStats.maxMP + "\n" +
                    "ATK: " + players[3].unitStats.atk + "\n" +
                    "DEF: " + players[3].unitStats.def + "\n" +
                    "RES: " + players[3].unitStats.res + "\n" +
                    "SPD: " + players[3].unitStats.spd + "\n" +
                    "LUCK: " + players[3].unitStats.luck, { color: "#ff2f2f", align: "center", fontWegight: 
                    'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                textsprite4.visible = false;
                player4.setScale(0.8);
                player4.on('pointerover', function(pointer){
                    this.setTint(0x87ceeb);
                    spritegraphics4.visible = true;
                    textsprite4.visible = true;
                })
                player4.on('pointerout', function(pointer){
                    spritegraphics4.visible = false;
                    textsprite4.visible = false;
                    this.clearTint();
                });

                playerUI4 = new UIinformation(players[i].unitName, player4, hp4, mp4, players[i].unitBattleSkills,
                    players[i].unitSkills, null, hptext4, mptext4);
                UIarray.push(playerUI4);
            }
        }

        //enemies
        for (var i = 0; i < enemies.length; i++){
            if (i == 0){
                //if there is only one enemy
                var enemy1 = this.add.sprite(58, 1024-3*95-40 + i * 120, enemies[i].unitSprites).setInteractive();
                hp_enemy1 = new HealthBar(this.scene.get("UIScene"), 158, 1024-3*95-40 + i * 120 - 38, enemies[0].unitStats.hp);
                var textName = this.add.text(20, 1024-3*95-40 + 36 + i * 120, enemies[i].unitName,{ color: "#FF0000",fontWegight: 
                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                for (var j = 0; j < enemies[i].unitSkills.length; j++){
                    if (j === 0){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics20 = this.scene.get("UIScene").add.graphics();
                        graphics20.lineStyle(1, 0xffffff, 0.8);
                        graphics20.fillStyle(0x000000, 1);        
                        graphics20.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics20.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics20.visible = false;

                        var text20 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[0].skillName +
                            ": " + enemies[i].unitSkills[0].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text20.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics20.visible = true;
                            text20.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics20.visible = false;
                            text20.visible = false;
                        });
                    }
                    if (j === 1){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics21 = this.scene.get("UIScene").add.graphics();
                        graphics21.lineStyle(1, 0xffffff, 0.8);
                        graphics21.fillStyle(0x000000, 1);        
                        graphics21.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics21.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics21.visible = false;

                        var text21 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[1].skillName +
                            ": " + enemies[i].unitSkills[1].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text21.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics21.visible = true;
                            text21.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics21.visible = false;
                            text21.visible = false;
                        });
                    }
                    if (j === 2){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics22 = this.scene.get("UIScene").add.graphics();
                        graphics22.lineStyle(1, 0xffffff, 0.8);
                        graphics22.fillStyle(0x000000, 1);        
                        graphics22.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics22.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics22.visible = false;

                        var text22 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[2].skillName +
                            ": " + enemies[i].unitSkills[2].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text22.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics22.visible = true;
                            text22.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics22.visible = false;
                            text22.visible = false;
                        });
                    }
                    if (j === 3){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics23 = this.scene.get("UIScene").add.graphics();
                        graphics23.lineStyle(1, 0xffffff, 0.8);
                        graphics23.fillStyle(0x000000, 1);        
                        graphics23.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics23.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics23.visible = false;

                        var text23 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[3].skillName +
                            ": " + enemies[i].unitSkills[3].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text23.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics23.visible = true;
                            text23.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics23.visible = false;
                            text23.visible = false;
                        });
                    }
                    if (j === 4){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics24 = this.scene.get("UIScene").add.graphics();
                        graphics24.lineStyle(1, 0xffffff, 0.8);
                        graphics24.fillStyle(0x000000, 1);        
                        graphics24.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics24.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics24.visible = false;

                        var text24 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[4].skillName +
                            ": " + enemies[i].unitSkills[4].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text24.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics24.visible = true;
                            text24.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics24.visible = false;
                            text24.visible = false;
                        });
                    }


                }

                enemy1.setScale(0.8);
                enemy1.on('pointerover', function(pointer){
                    console.log("clicked on enemy " + enemies[0].unitName);
                    this.setTint(0xff0000);
                });
                enemy1.on('pointerout', function(pointer){
                    this.clearTint();
                });

                enemyUI1 = new EnemyUIinformation(enemies[i].unitName, enemy1, hp_enemy1, enemies[i].unitBattleSkills,
                   enemies[i].unitSkills, null);
                EnemyUIarray.push(enemyUI1);
            }
            else if (i === 1){
                var enemy2 = this.add.sprite(58, 1024-3*95-40 + i * 120, enemies[i].unitSprites).setInteractive();
                enemy2.setScale(0.8);
                hp_enemy2 = new HealthBar(this.scene.get("UIScene"), 158, 1024-3*95-40 + i * 120 - 38, enemies[1].unitStats.hp);
                var textName = this.add.text(20, 1024-3*95-40 + 36 + i * 120, enemies[i].unitName,{ color: "#FF0000",fontWegight: 
                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                for (var j = 0; j < enemies[i].unitSkills.length; j++){
                    if (j === 0){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics25 = this.scene.get("UIScene").add.graphics();
                        graphics25.lineStyle(1, 0xffffff, 0.8);
                        graphics25.fillStyle(0x000000, 1);        
                        graphics25.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics25.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics25.visible = false;

                        var text25 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[0].skillName +
                            ": " + enemies[i].unitSkills[0].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text25.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics25.visible = true;
                            text25.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics25.visible = false;
                            text25.visible = false;
                        });
                    }
                    if (j === 1){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics26 = this.scene.get("UIScene").add.graphics();
                        graphics26.lineStyle(1, 0xffffff, 0.8);
                        graphics26.fillStyle(0x000000, 1);        
                        graphics26.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics26.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics26.visible = false;

                        var text26 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[1].skillName +
                            ": " + enemies[i].unitSkills[1].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text26.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics26.visible = true;
                            text26.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics26.visible = false;
                            text26.visible = false;
                        });
                    }
                    if (j === 2){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics27 = this.scene.get("UIScene").add.graphics();
                        graphics27.lineStyle(1, 0xffffff, 0.8);
                        graphics27.fillStyle(0x000000, 1);        
                        graphics27.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics27.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics27.visible = false;

                        var text27 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[2].skillName +
                            ": " + enemies[i].unitSkills[2].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text27.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics27.visible = true;
                            text27.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics27.visible = false;
                            text27.visible = false;
                        });
                    }
                    if (j === 3){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics28 = this.scene.get("UIScene").add.graphics();
                        graphics28.lineStyle(1, 0xffffff, 0.8);
                        graphics28.fillStyle(0x000000, 1);        
                        graphics28.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics28.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics28.visible = false;

                        var text28 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[3].skillName +
                            ": " + enemies[i].unitSkills[3].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text28.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics28.visible = true;
                            text28.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics28.visible = false;
                            text28.visible = false;
                        });
                    }
                    if (j === 4){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics29 = this.scene.get("UIScene").add.graphics();
                        graphics29.lineStyle(1, 0xffffff, 0.8);
                        graphics29.fillStyle(0x000000, 1);        
                        graphics29.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics29.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics29.visible = false;

                        var text29 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[4].skillName +
                            ": " + enemies[i].unitSkills[4].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text29.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics29.visible = true;
                            text29.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics29.visible = false;
                            text29.visible = false;
                        });
                    }
                }
                enemy2.on('pointerover', function(pointer){
                    console.log("clicked on enemy " + enemies[1].unitName);
                    this.setTint(0xff0000);
                });
                enemy2.on('pointerout', function(pointer){
                    this.clearTint();
                });
                enemyUI2 = new EnemyUIinformation(enemies[i].unitName, enemy2, hp_enemy2, enemies[i].unitBattleSkills,
                    enemies[i].unitSkills, null);
                 EnemyUIarray.push(enemyUI2);

            }
            else if (i === 2){
                var enemy3 = this.add.sprite(58, 1024-3*95-40 + i * 120, enemies[i].unitSprites).setInteractive();
                enemy3.setScale(0.8);
                hp_enemy3 = new HealthBar(this.scene.get("UIScene"), 158, 1024-3*95-40 + i * 120 - 38, enemies[2].unitStats.hp);
                var textName = this.add.text(20, 1024-3*95-40 + 36 + i * 120, enemies[i].unitName,{ color: "#FF0000",fontWegight: 
                'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                for (var j = 0; j < enemies[i].unitSkills.length; j++){
                    if (j === 0){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics30 = this.scene.get("UIScene").add.graphics();
                        graphics30.lineStyle(1, 0xffffff, 0.8);
                        graphics30.fillStyle(0x000000, 1);        
                        graphics30.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics30.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics30.visible = false;

                        var text30 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[0].skillName +
                            ": " + enemies[i].unitSkills[0].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text30.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics30.visible = true;
                            text30.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics30.visible = false;
                            text30.visible = false;
                        });
                    }
                    if (j === 1){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics31 = this.scene.get("UIScene").add.graphics();
                        graphics31.lineStyle(1, 0xffffff, 0.8);
                        graphics31.fillStyle(0x000000, 1);        
                        graphics31.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics31.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics31.visible = false;

                        var text31 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[1].skillName +
                            ": " + enemies[i].unitSkills[1].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text31.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics31.visible = true;
                            text31.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics31.visible = false;
                            text31.visible = false;
                        });
                    }
                    if (j === 2){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics32 = this.scene.get("UIScene").add.graphics();
                        graphics32.lineStyle(1, 0xffffff, 0.8);
                        graphics32.fillStyle(0x000000, 1);        
                        graphics32.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics32.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics32.visible = false;

                        var text32 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[2].skillName +
                            ": " + enemies[i].unitSkills[2].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text32.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics32.visible = true;
                            text32.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics32.visible = false;
                            text32.visible = false;
                        });
                    }
                    if (j === 3){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics33 = this.scene.get("UIScene").add.graphics();
                        graphics33.lineStyle(1, 0xffffff, 0.8);
                        graphics33.fillStyle(0x000000, 1);        
                        graphics33.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics33.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics33.visible = false;

                        var text33 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[3].skillName +
                            ": " + enemies[i].unitSkills[3].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text33.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics33.visible = true;
                            text33.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics33.visible = false;
                            text33.visible = false;
                        });
                    }
                    if (j === 4){
                        var skill = this.add.sprite(180 + j*36, 1024 - 3*95 - 78 + 35 + i*120, enemies[i].unitSkills[j].spriteName).setInteractive();

                        var graphics34 = this.scene.get("UIScene").add.graphics();
                        graphics34.lineStyle(1, 0xffffff, 0.8);
                        graphics34.fillStyle(0x000000, 1);        
                        graphics34.strokeRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics34.fillRect(180 + j*36, 1024 - 3*95 - 378 + 35 + i*120, 180, 280);
                        graphics34.visible = false;

                        var text34 = this.scene.get("UIScene").add.text(180 + j*36, 
                            1024 - 3*95 - 378 + 35 + i*120, enemies[i].unitSkills[4].skillName +
                            ": " + enemies[i].unitSkills[4].description, { color: "#ff2f2f", align: "center", fontWegight: 
                            'bold',font: '24px Arial', wordWrap: { width: 170, useAdvancedWrap: true }});
                        text34.visible = false;

                        skill.setScale(0.9); 
                        skill.on('pointerover', function(pointer){
                            console.log("clicked on skill");
                            graphics34.visible = true;
                            text34.visible = true;
                            this.setTint(0x87ceeb);

                        })
                        skill.on('pointerout', function(pointer){
                            this.clearTint();
                            graphics34.visible = false;
                            text34.visible = false;
                        });
                    }
                }
                enemy3.on('pointerover', function(pointer){
                    console.log("clicked on enemy " + enemies[2].unitName);
                    this.setTint(0xff0000);
                });
                enemy3.on('pointerout', function(pointer){
                    this.clearTint();
                });
                enemyUI3 = new EnemyUIinformation(enemies[i].unitName, enemy3, hp_enemy3, enemies[i].unitBattleSkills,
                    enemies[i].unitSkills, null);
                 EnemyUIarray.push(enemyUI3);
            }
            //there can only be 3 enemies at a time MAX
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
    constructor (name, sprites, hp_bar, mp_bar, battleSkills, skills, status_effects, hp_text, mp_text)
    {
        //this.animations = animations;
        this.name = name; //the name of the characer 
        this.sprites = sprites;
        this.hp_bar = hp_bar; //hp bar and mp bars already have their respective classes
        this.mp_bar = mp_bar; //hp bar and mp bars already have their respective classes
        //this.hp_count = hp_count;
        //this.mp_count = mp_count;
        this.battleSkills = battleSkills;
        this.skills = skills; //don't need class for that, just pass in the skill icon object, shouldn't change
        this.status_effects = status_effects;
        this.hp_text = hp_text; //THE ACTUAL HP TEXT
        this.mp_text = mp_text;
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
    constructor(name, sprites, hp_bar, battleSkills, skills, status_effects){
        this.name = name; //the name of the character 
        //this.animations = animations;
        this.sprites = sprites;
        this.hp_bar = hp_bar;
        //this.hp_count = hp_count;
        this.battleSkills = battleSkills;
        this.skills = skills;
        this.status_effects = status_effects;
    }
}


