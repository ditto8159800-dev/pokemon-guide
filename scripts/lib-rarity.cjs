// Rarity ranking used for auto chase-card selection (higher = rarer)
const RANK={
 "Mega Hyper Rare":100,"Hyper rare":95,"Special illustration rare":92,"Secret Rare":90,"Shiny Ultra Rare":85,"Crown":88,
 "Character Super Rare":80,"Gold Star":89,"Rare Holo LV.X":70,"LEGEND":72,"Shiny rare VMAX":78,"Shiny rare V":76,
 "Illustration rare":75,"Character Rare":68,"Ultra Rare":74,"Full Art Trainer":73,"Amazing Rare":71,"Radiant Rare":66,
 "Shining":80,"Shiny rare":64,"Holo Rare VMAX":62,"Holo Rare VSTAR":61,"Rare PRIME":63,"Black White Rare":82,"Triple Rare":60,"Classic Collection":65,"ACE SPEC Rare":58,
 "Holo Rare V":55,"Double rare":50,"Rare Holo":45,"Holo Rare":45,"Pikachu Rare":40,"Futuristic Rare":40,
 "Rare":20,"Promo":10,"Uncommon":5,"Common":1,"None":0,"null":0
};
// Popular Pokémon used only as a tie-breaker inside the same rarity tier
const POP=["Charizard","Pikachu","Umbreon","Mew","Mewtwo","Lugia","Rayquaza","Gengar","Eevee","Espeon","Sylveon","Gardevoir","Blastoise","Venusaur","Dragonite","Gyarados","Giratina","Greninja","Lucario","Snorlax","Leafeon","Glaceon","Vaporeon","Jolteon","Flareon","Ho-Oh","Suicune","Celebi","Arceus","Latias","Latios","Moltres","Zapdos","Articuno","Iono","Lillie","Marnie","Cynthia","Erika","Misty","Mimikyu","Dragapult","Tyranitar","Alakazam","Machamp","Ninetales","Raichu"];
const popScore=n=>{const i=POP.findIndex(p=>(n||'').includes(p));return i<0?0:(POP.length-i);};
module.exports={RANK,popScore};
