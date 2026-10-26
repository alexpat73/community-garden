// ============================================================
// Example data for the garden groups prototype.
// The gardens, people and notes are made up on purpose: putting invented
// members or notes on a real garden's page would misrepresent a real place.
// "Reset prototype data" on the Gardens page brings these back.
// ============================================================

// Fictional gardens, shown in the search with an "Example" badge.
// Same shape as GARDENS in gardens-data.js, except the neighbourhood is given by name:
// [name, type, lat, lon, district index, website, postcode, id, neighbourhood]
const DEMO_GARDENS = [
  ["Sonnenbeet Wedding (example)", "c", 52.5486, 13.3552, 4, "", "13353", "demo-wedding", "Wedding"],
  ["Kiezgarten Rixdorf (example)", "c", 52.4731, 13.4436, 5, "", "12043", "demo-rixdorf", "Neukölln"],
  ["Laubenpieper an der Spree (example)", "a", 52.4562, 13.5584, 11, "", "12459", "demo-spree", "Oberschöneweide"],
];

// The groups that belong to the example gardens. "date" is days ago, so the examples never look old.
const DEMO_GROUPS = [
  {
    id: "demo-wedding",
    gardenId: "demo-wedding",
    name: "Sonnenbeet Wedding",
    description: "Twelve raised beds in a backyard in Wedding. We meet on Saturday mornings, share tools and swap seeds. Beginners welcome!",
    owner: "Anna",
    members: [
      { name: "Anna", growing: ["tomato", "basil", "zucchini"] },
      { name: "Mehmet", growing: ["pepper", "chilli", "cucumber"] },
      { name: "Lena", growing: ["radish", "lettuce", "strawberry"] },
      { name: "Jonas", growing: ["potato", "kale"] },
    ],
    notes: [
      { author: "Anna", daysAgo: 1, visibility: "public", text: "Seed swap this Saturday at 10:00 by the shed. Bring whatever you have too much of!" },
      { author: "Mehmet", daysAgo: 3, visibility: "members", text: "The water butt by bed 3 is leaking. Please use the tap until I've fixed it." },
      { author: "Lena", daysAgo: 6, visibility: "public", text: "Slugs are bad after the rain. Beer traps are under the bench, help yourself." },
      { author: "Anna", daysAgo: 9, visibility: "members", text: "New code for the key box: ask me in person, I won't post it here." },
      { author: "Jonas", daysAgo: 14, visibility: "public", text: "Kale is finally ready. If you've never tried it: wait until after the first frost, it gets sweeter." },
    ],
  },
  {
    id: "demo-rixdorf",
    gardenId: "demo-rixdorf",
    name: "Kiezgarten Rixdorf",
    description: "A small neighbourhood garden behind the community centre. Shared compost, a herb spiral and a bee hotel.",
    owner: "Sophie",
    members: [
      { name: "Sophie", growing: ["chives", "parsley", "dill"] },
      { name: "Ali", growing: ["broad-bean", "onion", "garlic"] },
      { name: "Marta", growing: ["pot-marigold", "chard"] },
    ],
    notes: [
      { author: "Sophie", daysAgo: 2, visibility: "public", text: "Compost turned on Sunday. Thanks to everyone who helped!" },
      { author: "Ali", daysAgo: 4, visibility: "members", text: "I planted garlic along the fence. Please don't dig there until July." },
      { author: "Marta", daysAgo: 8, visibility: "members", text: "Who borrowed the long hose? It's not in the shed." },
    ],
  },
  {
    id: "demo-spree",
    gardenId: "demo-spree",
    name: "Laubenpieper an der Spree",
    description: "Allotment colony by the river. This group is for plot holders to share tips, tools and spare seedlings.",
    owner: "Klaus",
    members: [
      { name: "Klaus", growing: ["rhubarb", "potato", "leek"] },
      { name: "Birgit", growing: ["strawberry", "beetroot", "carrot"] },
    ],
    notes: [
      { author: "Klaus", daysAgo: 1, visibility: "public", text: "Reminder: the water is turned off for the winter from 1 November. Empty your hoses before the first frost." },
      { author: "Birgit", daysAgo: 5, visibility: "members", text: "Spare strawberry runners at plot 14, free to anyone who wants them." },
    ],
  },
];

// Pretend join requests that arrive when you start a group of your own.
const DEMO_REQUESTS = [
  { name: "Yusuf", growing: "Tomatoes and peppers", message: "Hi! I live two streets away and would love to help with watering in summer." },
  { name: "Clara", growing: "Herbs, maybe strawberries", message: "I'm new to gardening and looking for people to learn from. Could I join?" },
];
