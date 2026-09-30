// ============================================================
// Garden data for a German allotment (Schrebergarten).
// Months are numbers: 1 = January ... 12 = December.
// Edit this file to add plants or change dates - every page reads from it.
// ============================================================

// Typical long-term averages for central Germany (roughly DWD 1991-2020 normals).
// The north is a bit milder in winter, the south and high ground are colder.
const MONTHS = [
  {
    name: "January", short: "Jan", season: "winter",
    high: 3, low: -2, rain: 55, daylight: 8,
    frostRisk: "High", frostNote: "The ground is often frozen.",
    jobs: [
      "Plan which crop goes in which bed and order your seeds.",
      "Harvest kale, leeks, parsnips and lamb's lettuce.",
      "At the end of the month, start chillies on a warm windowsill.",
      "Clean and sharpen your tools.",
      "Check any stored crops for rot.",
    ],
  },
  {
    name: "February", short: "Feb", season: "winter",
    high: 5, low: -2, rain: 45, daylight: 10,
    frostRisk: "High", frostNote: "Hard frosts are still common.",
    jobs: [
      "Sow peppers, leeks, kohlrabi and early lettuce indoors.",
      "On frost-free days, dig in compost and prepare the beds.",
      "In mild spells, sow broad beans outside.",
      "Buy seed potatoes and onion sets.",
    ],
  },
  {
    name: "March", short: "Mar", season: "spring",
    high: 9, low: 1, rain: 50, daylight: 12,
    frostRisk: "High", frostNote: "Night frosts are common.",
    jobs: [
      "Lay seed potatoes out in a bright, cool room to sprout (Vorkeimen).",
      "Sow tomatoes indoors in the second half of the month.",
      "First outdoor sowings: peas, radishes, spinach, carrots. Cover them with fleece.",
      "Plant onion sets and rhubarb.",
      "Rake the beds level once the soil has dried out a little.",
    ],
  },
  {
    name: "April", short: "Apr", season: "spring",
    high: 14, low: 4, rain: 40, daylight: 14,
    frostRisk: "Medium", frostNote: "Night frosts are still possible, so keep fleece handy.",
    jobs: [
      "Plant potatoes.",
      "Harden off seedlings: put them outside during the day, bring them in at night.",
      "Sow beetroot, chard, dill and more carrots directly in the bed.",
      "Watch for night frosts: 'Aprilwetter' changes fast.",
      "Start weeding while the weeds are still small.",
    ],
  },
  {
    name: "May", short: "May", season: "spring",
    high: 18, low: 8, rain: 60, daylight: 15.5,
    frostRisk: "Low", frostNote: "Late frosts are possible until the Eisheiligen (11-15 May).",
    jobs: [
      "Wait until after the Eisheiligen (11-15 May) to plant out tomatoes, peppers, cucumbers, zucchini, pumpkins and basil.",
      "Sow beans once the soil has warmed up.",
      "Mulch between the rows to keep moisture in.",
      "Pile soil up around the potato stems.",
      "Sow radishes and lettuce again for a steady harvest.",
    ],
  },
  {
    name: "June", short: "Jun", season: "summer",
    high: 22, low: 11, rain: 65, daylight: 16.5,
    frostRisk: "None", frostNote: "Frost-free.",
    jobs: [
      "Water in the morning, at the base of the plants.",
      "Tie up tomatoes and pinch out the side shoots (Ausgeizen).",
      "Stop harvesting rhubarb on 24 June (Johannistag).",
      "Harvest early potatoes, peas and strawberries.",
      "Sow kale and plant out leeks.",
    ],
  },
  {
    name: "July", short: "Jul", season: "summer",
    high: 24, low: 13, rain: 75, daylight: 16,
    frostRisk: "None", frostNote: "Frost-free.",
    jobs: [
      "In dry spells, water deeply 2-3 times a week rather than a little every day.",
      "Pick zucchini, beans and cucumbers often: it keeps them producing.",
      "Check tomatoes for blight (brown spots) and remove affected leaves.",
      "Plant out kale. Sow a last row of beans and carrots.",
      "Plant a new strawberry bed.",
    ],
  },
  {
    name: "August", short: "Aug", season: "summer",
    high: 24, low: 13, rain: 70, daylight: 14.5,
    frostRisk: "None", frostNote: "Frost-free.",
    jobs: [
      "Sow lamb's lettuce and autumn spinach on beds that are now empty.",
      "Keep harvesting and watering.",
      "Dry onions and garlic in the sun after harvesting.",
      "Sow green manure (e.g. phacelia) on beds you won't use again this year.",
      "Save seeds from beans, peas and flowers.",
    ],
  },
  {
    name: "September", short: "Sep", season: "autumn",
    high: 19, low: 10, rain: 55, daylight: 12.5,
    frostRisk: "Low", frostNote: "Mostly frost-free. Cold valleys can get a first frost late in the month.",
    jobs: [
      "Main harvest: pumpkins, potatoes, beetroot, the last tomatoes.",
      "Plant garlic for next year.",
      "Sow the last lamb's lettuce and spinach.",
      "Cover empty beds with green manure or mulch.",
      "Write down what worked and what didn't while you still remember!",
    ],
  },
  {
    name: "October", short: "Oct", season: "autumn",
    high: 14, low: 6, rain: 55, daylight: 10.5,
    frostRisk: "Medium", frostNote: "The first frosts usually arrive in the second half of the month.",
    jobs: [
      "Bring in pumpkins, zucchini and tomatoes before the first frost.",
      "Plant garlic and rhubarb.",
      "Clear finished beds and put the plant waste on the compost.",
      "Spread compost or leaves on empty beds.",
      "Leave a pile of leaves and twigs as a winter home for hedgehogs and insects.",
    ],
  },
  {
    name: "November", short: "Nov", season: "autumn",
    high: 8, low: 2, rain: 55, daylight: 9,
    frostRisk: "High", frostNote: "Frosty nights are normal.",
    jobs: [
      "Harvest kale and Brussels sprouts after the first frost; it makes them sweeter.",
      "Cover the beds with a layer of leaves or straw.",
      "Protect perennials and herbs with fleece.",
      "Empty pots, hoses and water butts before hard frost.",
      "Clean and oil your tools.",
    ],
  },
  {
    name: "December", short: "Dec", season: "winter",
    high: 4, low: -1, rain: 60, daylight: 8,
    frostRisk: "High", frostNote: "Frost and the occasional snow.",
    jobs: [
      "Harvest winter vegetables as you need them.",
      "Rest, and read through your notes from this year.",
      "Plan next year's crop rotation: don't grow the same plant family in the same bed two years running.",
      "Browse seed catalogues and make a wish list.",
    ],
  },
];

// Stages of a plant's year. The "code" is the letter shown in the calendar table.
const STAGES = [
  { key: "indoors",  label: "Start indoors", code: "I" },
  { key: "outdoors", label: "Sow outdoors",  code: "S" },
  { key: "plant",    label: "Plant out",     code: "P" },
  { key: "harvest",  label: "Harvest",       code: "H" },
];

// indoors / outdoors / plant / harvest = the months each stage happens in.
// tender: true = killed by frost, so it only goes outside after the Eisheiligen (mid-May).
// notes: extra text shown next to the plant for one stage.
const PLANTS = [
  // ---------- Vegetables ----------
  {
    id: "tomato", name: "Tomato", de: "Tomate", type: "Vegetables",
    indoors: [3, 4], plant: [5, 6], harvest: [7, 8, 9, 10], tender: true,
    spacing: "60 cm apart, rows 80 cm apart", sun: "Full sun", water: "Regularly, at the base, never on the leaves",
    difficulty: "Medium", good: ["Basil", "Carrot", "Parsley", "Pot marigold"], bad: ["Potato", "Fennel"],
    tip: "Keep the leaves dry: late blight (Kraut- und Braunfäule) is the big problem in wet German summers, and a simple rain roof helps a lot. Pinch out side shoots on tall varieties.",
  },
  {
    id: "pepper", name: "Sweet pepper", de: "Paprika", type: "Vegetables",
    indoors: [2, 3], plant: [5, 6], harvest: [8, 9, 10], tender: true,
    spacing: "40 cm apart, rows 50 cm apart", sun: "Full sun, warm and sheltered", water: "Evenly moist, never soggy",
    difficulty: "Medium", good: ["Basil", "Tomato"], bad: ["Fennel"],
    tip: "Likes it even warmer than tomatoes. Outdoors, give it the sunniest, most sheltered spot you have, or grow it in a pot against a south-facing wall.",
  },
  {
    id: "chilli", name: "Chilli", de: "Chili", type: "Vegetables",
    indoors: [1, 2, 3], plant: [5, 6], harvest: [7, 8, 9, 10], tender: true,
    spacing: "40 cm apart", sun: "Full sun, warm and sheltered", water: "Evenly moist, never soggy",
    difficulty: "Medium", good: ["Basil", "Tomato"], bad: ["Fennel"],
    tip: "Needs a long season, so start it early on a warm windowsill (20-25 °C). Does best in a pot you can move.",
  },
  {
    id: "cucumber", name: "Cucumber", de: "Gurke", type: "Vegetables",
    indoors: [4, 5], outdoors: [5, 6], plant: [5, 6], harvest: [7, 8, 9], tender: true,
    spacing: "40-60 cm apart", sun: "Full sun, sheltered from wind", water: "Lots, ideally with lukewarm water",
    difficulty: "Medium", good: ["Dill", "Bush bean", "Lettuce"], bad: ["Tomato", "Potato"],
    tip: "Hates the cold. Don't rush it outside: wait until nights stay above about 10 °C.",
  },
  {
    id: "zucchini", name: "Zucchini", de: "Zucchini", type: "Vegetables",
    indoors: [4, 5], outdoors: [5, 6], plant: [5, 6], harvest: [7, 8, 9, 10], tender: true,
    spacing: "1 m apart; one or two plants is plenty", sun: "Full sun", water: "Lots",
    difficulty: "Easy", good: ["Bush bean", "Onion"], bad: ["Potato", "Cucumber"],
    tip: "Pick them small (15-20 cm) and often. In July they grow astonishingly fast.",
  },
  {
    id: "pumpkin", name: "Pumpkin", de: "Kürbis", type: "Vegetables",
    indoors: [4, 5], outdoors: [5, 6], plant: [5, 6], harvest: [9, 10], tender: true,
    spacing: "1.5 m apart", sun: "Full sun", water: "Lots, keep the leaves dry",
    difficulty: "Easy", good: ["Bush bean"], bad: ["Potato"],
    tip: "Needs space and rich soil; many gardeners plant it right on the compost heap. Harvest before the first frost.",
  },
  {
    id: "bush-bean", name: "Bush bean", de: "Buschbohne", type: "Vegetables",
    outdoors: [5, 6, 7], harvest: [7, 8, 9], tender: true,
    spacing: "Rows 40 cm apart, seeds 5-8 cm apart", sun: "Full sun", water: "Moderate, more once they flower",
    difficulty: "Easy", good: ["Savory", "Cucumber", "Potato", "Lettuce"], bad: ["Onion", "Garlic", "Leek", "Pea"],
    tip: "Sow only once the soil is warm (after mid-May); in cold, wet soil the seeds rot. A second sowing in early July gives a second harvest.",
  },
  {
    id: "broad-bean", name: "Broad bean", de: "Dicke Bohne", type: "Vegetables",
    outdoors: [2, 3, 4], harvest: [6, 7],
    spacing: "Rows 40 cm apart, seeds 10-15 cm apart", sun: "Sun or light shade", water: "Moderate",
    difficulty: "Easy", good: ["Potato", "Lettuce", "Savory"], bad: ["Onion", "Garlic"],
    tip: "Very hardy: one of the first things you can sow. Pinch out the tips once pods form to keep black aphids away.",
  },
  {
    id: "pea", name: "Pea", de: "Erbse", type: "Vegetables",
    outdoors: [3, 4, 5], harvest: [6, 7],
    spacing: "Rows 40 cm apart, seeds 5 cm apart", sun: "Sun or light shade", water: "Moderate, more once they flower",
    difficulty: "Easy", good: ["Carrot", "Lettuce", "Radish", "Kohlrabi"], bad: ["Bush bean", "Onion", "Garlic"],
    tip: "Give them something to climb, like twigs or netting. Sow them in a different spot every year.",
  },
  {
    id: "radish", name: "Radish", de: "Radieschen", type: "Vegetables",
    outdoors: [3, 4, 5, 6, 7, 8, 9], harvest: [4, 5, 6, 7, 8, 9, 10],
    spacing: "Rows 15 cm apart, 3 cm apart in the row", sun: "Sun or light shade", water: "Keep moist, or they turn woody and hot",
    difficulty: "Easy", good: ["Carrot", "Lettuce", "Pea", "Spinach"], bad: [],
    tip: "The perfect first crop: ready in 4-6 weeks. Sow a short row every two weeks instead of all at once.",
  },
  {
    id: "lettuce", name: "Lettuce", de: "Salat", type: "Vegetables",
    indoors: [2, 3], outdoors: [3, 4, 5, 6, 7, 8], plant: [4, 5, 6, 7, 8], harvest: [5, 6, 7, 8, 9, 10],
    spacing: "25-30 cm apart", sun: "Sun, light shade in midsummer", water: "Regularly, in the morning",
    difficulty: "Easy", good: ["Radish", "Carrot", "Kohlrabi", "Strawberry"], bad: ["Parsley"],
    tip: "Lettuce needs light to germinate: press the seed onto the soil, don't bury it. In hot spells, sow in light shade or it bolts (goes to flower).",
  },
  {
    id: "lambs-lettuce", name: "Lamb's lettuce", de: "Feldsalat", type: "Vegetables",
    outdoors: [8, 9], harvest: [10, 11, 12, 1, 2, 3],
    spacing: "Rows 10-15 cm apart, sow thinly", sun: "Sun or light shade", water: "Keep moist until it sprouts",
    difficulty: "Easy", good: ["Onion", "Leek"], bad: [],
    tip: "The classic German winter salad. Sow it on beds left empty after the summer harvest; it survives frost and can be picked all winter.",
  },
  {
    id: "spinach", name: "Spinach", de: "Spinat", type: "Vegetables",
    outdoors: [3, 4, 8, 9], harvest: [4, 5, 6, 10, 11],
    spacing: "Rows 25 cm apart", sun: "Sun or light shade", water: "Regularly",
    difficulty: "Easy", good: ["Radish", "Strawberry", "Potato", "Kohlrabi"], bad: ["Beetroot", "Swiss chard"],
    tip: "Likes cool weather. Long summer days make it bolt, so sow in spring and again in late summer.",
  },
  {
    id: "chard", name: "Swiss chard", de: "Mangold", type: "Vegetables",
    outdoors: [4, 5, 6, 7], harvest: [6, 7, 8, 9, 10, 11],
    spacing: "30-40 cm apart", sun: "Sun or light shade", water: "Regularly",
    difficulty: "Easy", good: ["Radish", "Lettuce", "Bush bean"], bad: ["Spinach", "Beetroot"],
    tip: "Almost impossible to fail with. Pick the outer leaves and it keeps growing until late autumn.",
  },
  {
    id: "carrot", name: "Carrot", de: "Möhre", type: "Vegetables",
    outdoors: [3, 4, 5, 6, 7], harvest: [6, 7, 8, 9, 10, 11],
    spacing: "Rows 25 cm apart, thin to 3-5 cm", sun: "Full sun", water: "Keep moist until they sprout",
    difficulty: "Medium", good: ["Onion", "Leek", "Radish", "Pea"], bad: [],
    tip: "The seeds take 2-4 weeks to come up, so mix in a few radish seeds to mark the row. Onions or leeks next to them help keep the carrot fly away.",
  },
  {
    id: "beetroot", name: "Beetroot", de: "Rote Bete", type: "Vegetables",
    outdoors: [4, 5, 6, 7], harvest: [7, 8, 9, 10],
    spacing: "Rows 30 cm apart, thin to 10 cm", sun: "Full sun", water: "Moderate",
    difficulty: "Easy", good: ["Onion", "Kohlrabi", "Lettuce"], bad: ["Spinach", "Swiss chard"],
    tip: "Each 'seed' is really a cluster that sprouts several seedlings. Thin them out so the roots have room.",
  },
  {
    id: "parsnip", name: "Parsnip", de: "Pastinake", type: "Vegetables",
    outdoors: [3, 4, 5], harvest: [10, 11, 12, 1, 2, 3],
    spacing: "Rows 35 cm apart, thin to 10 cm", sun: "Full sun", water: "Moderate",
    difficulty: "Easy", good: ["Onion", "Radish", "Lettuce"], bad: [],
    tip: "Buy fresh seed every year: old seed rarely comes up. The roots can stay in the ground all winter and taste sweeter after frost.",
  },
  {
    id: "potato", name: "Potato", de: "Kartoffel", type: "Vegetables",
    indoors: [3], plant: [4, 5], harvest: [6, 7, 8, 9, 10],
    notes: { indoors: "sprout seed potatoes (Vorkeimen)", plant: "seed potatoes" },
    spacing: "35 cm apart, rows 70 cm apart", sun: "Full sun", water: "Moderate, more once they flower",
    difficulty: "Easy", good: ["Bush bean", "Broad bean", "Kohlrabi", "Spinach"], bad: ["Tomato", "Cucumber", "Pumpkin"],
    tip: "In March, stand seed potatoes in egg boxes in a bright, cool room to sprout. Pile soil up around the stems as they grow. Early varieties are ready in June.",
  },
  {
    id: "kohlrabi", name: "Kohlrabi", de: "Kohlrabi", type: "Vegetables",
    indoors: [2, 3, 4], outdoors: [4, 5, 6, 7], plant: [4, 5, 6, 7, 8], harvest: [5, 6, 7, 8, 9, 10],
    spacing: "25-30 cm apart", sun: "Sun or light shade", water: "Evenly, or the bulbs crack",
    difficulty: "Easy", good: ["Lettuce", "Pea", "Beetroot", "Spinach"], bad: ["Strawberry"],
    tip: "A German favourite. Harvest when the bulb is the size of a tennis ball; bigger ones turn woody.",
  },
  {
    id: "kale", name: "Kale", de: "Grünkohl", type: "Vegetables",
    outdoors: [5, 6], plant: [6, 7], harvest: [10, 11, 12, 1, 2],
    notes: { outdoors: "in a seedbed, move later" },
    spacing: "40-50 cm apart", sun: "Sun or light shade", water: "Moderate",
    difficulty: "Easy", good: ["Bush bean", "Lettuce", "Spinach"], bad: ["Strawberry", "Onion", "Garlic"],
    tip: "Traditionally picked only after the first frost, because the cold makes it sweeter. Hardy enough to stand in the bed all winter.",
  },
  {
    id: "brussels-sprouts", name: "Brussels sprouts", de: "Rosenkohl", type: "Vegetables",
    indoors: [3, 4], plant: [5, 6], harvest: [10, 11, 12, 1, 2],
    spacing: "50-60 cm apart", sun: "Full sun", water: "Moderate",
    difficulty: "Medium", good: ["Lettuce", "Spinach", "Bush bean"], bad: ["Strawberry", "Onion", "Garlic"],
    tip: "A long crop that stands in the bed from May into winter. Pick the sprouts from the bottom up; frost improves the taste.",
  },
  {
    id: "leek", name: "Leek", de: "Lauch / Porree", type: "Vegetables",
    indoors: [2, 3, 4], plant: [5, 6, 7], harvest: [8, 9, 10, 11, 12, 1, 2],
    spacing: "15 cm apart, rows 30-40 cm apart", sun: "Full sun", water: "Moderate",
    difficulty: "Medium", good: ["Carrot", "Strawberry", "Lamb's lettuce"], bad: ["Bush bean", "Pea"],
    tip: "Drop the seedlings into deep holes and water them in: the buried part turns white and tender. Winter varieties can stay in the ground until you need them.",
  },
  {
    id: "onion", name: "Onion", de: "Zwiebel", type: "Vegetables",
    plant: [3, 4], harvest: [7, 8, 9],
    notes: { plant: "onion sets (Steckzwiebeln)" },
    spacing: "10 cm apart, rows 25 cm apart", sun: "Full sun", water: "Little; stop watering once the bulbs swell",
    difficulty: "Easy", good: ["Carrot", "Beetroot", "Lettuce", "Strawberry"], bad: ["Bush bean", "Pea", "Kale"],
    tip: "Onion sets are much easier than seed. Harvest when the leaves flop over, then let them dry in the sun for a few days.",
  },
  {
    id: "garlic", name: "Garlic", de: "Knoblauch", type: "Vegetables",
    plant: [2, 3, 9, 10], harvest: [6, 7, 8],
    notes: { plant: "single cloves, pointy end up" },
    spacing: "15 cm apart, rows 25 cm apart", sun: "Full sun", water: "Little",
    difficulty: "Easy", good: ["Strawberry", "Carrot", "Tomato"], bad: ["Bush bean", "Pea", "Kale"],
    tip: "Plant cloves 5 cm deep. Garlic planted in autumn gives bigger bulbs. Harvest when the lower third of the leaves has turned yellow.",
  },

  // ---------- Fruit ----------
  {
    id: "strawberry", name: "Strawberry", de: "Erdbeere", type: "Fruit",
    plant: [7, 8, 9], harvest: [6, 7],
    notes: { plant: "young plants or runners" },
    spacing: "30 cm apart, rows 60 cm apart", sun: "Full sun", water: "Regularly while fruiting",
    difficulty: "Easy", good: ["Garlic", "Leek", "Lettuce", "Spinach"], bad: ["Kale", "Brussels sprouts"],
    tip: "Plant in late summer for a full harvest next June. A bed lasts 3-4 years. Put straw under the fruit to keep it clean and dry.",
  },
  {
    id: "rhubarb", name: "Rhubarb", de: "Rhabarber", type: "Fruit",
    plant: [3, 4, 10, 11], harvest: [4, 5, 6],
    notes: { plant: "a root division (perennial)" },
    spacing: "1 m apart", sun: "Sun or light shade", water: "Lots in dry spells",
    difficulty: "Easy", good: [], bad: [],
    tip: "A perennial that stays for 10 years or more. Don't harvest in its first year. Stop picking on 24 June (Johannistag) so it can recover, and never eat the leaves.",
  },

  // ---------- Herbs ----------
  {
    id: "basil", name: "Basil", de: "Basilikum", type: "Herbs",
    indoors: [3, 4, 5], plant: [5, 6], harvest: [6, 7, 8, 9], tender: true,
    spacing: "20-25 cm apart", sun: "Full sun, warm", water: "Moderate, in the morning",
    difficulty: "Medium", good: ["Tomato", "Sweet pepper"], bad: [],
    tip: "Very sensitive to cold. Keep it on the windowsill until June, or grow it in a pot next to your tomatoes. Pick the tips to keep it bushy.",
  },
  {
    id: "parsley", name: "Parsley", de: "Petersilie", type: "Herbs",
    outdoors: [3, 4, 5, 6, 7], harvest: [5, 6, 7, 8, 9, 10, 11],
    spacing: "Rows 20-25 cm apart", sun: "Sun or light shade", water: "Keep moist",
    difficulty: "Medium", good: ["Tomato", "Radish"], bad: ["Lettuce"],
    tip: "Takes up to four weeks to sprout, so be patient and keep the soil moist. Don't grow it in the same spot two years in a row.",
  },
  {
    id: "chives", name: "Chives", de: "Schnittlauch", type: "Herbs",
    indoors: [3], outdoors: [4, 5], harvest: [4, 5, 6, 7, 8, 9, 10],
    spacing: "20 cm apart", sun: "Sun or light shade", water: "Moderate",
    difficulty: "Easy", good: ["Carrot", "Tomato", "Strawberry"], bad: ["Bush bean", "Pea"],
    tip: "The easiest herb there is. Buy one pot, plant it, and it comes back every spring. Cut it just above the ground and it regrows.",
  },
  {
    id: "dill", name: "Dill", de: "Dill", type: "Herbs",
    outdoors: [4, 5, 6, 7], harvest: [6, 7, 8, 9],
    spacing: "Rows 25 cm apart", sun: "Full sun", water: "Moderate",
    difficulty: "Easy", good: ["Cucumber", "Lettuce", "Onion"], bad: [],
    tip: "Sow it where it will grow; it doesn't like being moved. Sow a few seeds every few weeks for a steady supply for cucumber salad.",
  },

  // ---------- Flowers ----------
  {
    id: "pot-marigold", name: "Pot marigold", de: "Ringelblume", type: "Flowers",
    outdoors: [3, 4, 5], harvest: [6, 7, 8, 9, 10],
    notes: { harvest: "flowers" },
    spacing: "25-30 cm apart", sun: "Full sun", water: "Little",
    difficulty: "Easy", good: ["Tomato", "Carrot", "Lettuce"], bad: [],
    tip: "An easy flower that draws in bees and hoverflies (their larvae eat aphids). It seeds itself, so it often comes back on its own.",
  },
];

// Cities for the live forecast on the home page.
const CITIES = [
  { name: "Berlin",     lat: 52.52, lon: 13.41 },
  { name: "Hamburg",    lat: 53.55, lon: 9.99 },
  { name: "Munich",     lat: 48.14, lon: 11.58 },
  { name: "Cologne",    lat: 50.94, lon: 6.96 },
  { name: "Frankfurt",  lat: 50.11, lon: 8.68 },
  { name: "Stuttgart",  lat: 48.78, lon: 9.18 },
  { name: "Düsseldorf", lat: 51.23, lon: 6.78 },
  { name: "Leipzig",    lat: 51.34, lon: 12.37 },
  { name: "Dresden",    lat: 51.05, lon: 13.74 },
  { name: "Hanover",    lat: 52.37, lon: 9.73 },
  { name: "Potsdam",    lat: 52.39, lon: 13.06 },
];
