// Selection from the Set El Sham Restaurant menu (2026). Prep times and stock are simulated.
export type MenuItem = {
  id: number;
  category: string;
  name: string;
  price: number;
  prep: number;
  stock: number;
};

const raw: [string, string, number, number][] = [
  ["Soups", "Chicken Soup", 12, 4],
  ["Soups", "Veg Soup", 11, 4],
  ["Soups", "Sweet Corn Soup", 12, 4],
  ["Soups", "Hot & Sour Soup", 12, 4],
  ["Soups", "Seafood Soup", 18, 5],
  ["Soups", "Tomato Soup", 12, 4],
  ["Salads", "Green Salad", 13, 3],
  ["Salads", "Hummus Set", 10, 2],
  ["Salads", "Tabbouleh", 16, 3],
  ["Salads", "Fattoush", 16, 3],
  ["Salads", "Greek Salad", 19, 3],
  ["Salads", "Caesar Salad", 20, 3],
  ["Dynamite", "Dynamite Shrimp", 19, 5],
  ["Dynamite", "Dynamite Mixed Plate", 19, 5],
  ["Dynamite", "Dynamite Mozzarella", 19, 5],
  ["Dynamite", "Nuggets Crispy Dynamite", 20, 5],
  ["Dynamite", "Dynamite Popcorn", 24, 5],
  ["Dynamite", "Dynamite Wings", 24, 6],
  ["Fries & Plates", "Loaded Fries", 19, 4],
  ["Fries & Plates", "Onion Cheesy Fries", 19, 4],
  ["Fries & Plates", "French Fries", 9, 3],
  ["Fries & Plates", "Nuggets Plate", 13, 4],
  ["Fries & Plates", "Onion Rings", 11, 4],
  ["Fries & Plates", "Mozzarella Sticks", 21, 4],
  ["Fries & Plates", "London Squid", 19, 5],
  ["Fries & Plates", "Chicken Popcorn", 14, 4],
  ["Grill", "Juicy Turkish Charcoal", 30, 9],
  ["Grill", "Set Al Sham Special Charcoal", 27, 9],
  ["Grill", "Chicken Tikka", 32, 8],
  ["Grill", "Mutton Tikka", 35, 8],
  ["Grill", "Mix Tikka", 32, 8],
  ["Shawarma", "Arabic Shawarma", 18, 4],
  ["Pasta & Pizza", "Fettuccine with Vegetables", 25, 7],
  ["Pasta & Pizza", "Shawarma Pizza", 31, 8],
  ["Mexican", "Chicken Tacos", 36, 6],
  ["Mexican", "Beef Tacos", 36, 6],
  ["Mexican", "Paneer Tacos", 36, 6],
  ["Rice & Indian", "Chicken Biryani", 15, 6],
  ["Rice & Indian", "Mutton Biryani", 20, 7],
  ["Rice & Indian", "Veg / Egg Fried Rice", 17, 5],
  ["Rice & Indian", "Schezwan Fried Rice", 24, 6],
  ["Rice & Indian", "Chicken Kadai", 20, 7],
  ["Rice & Indian", "Paneer Butter Masala", 20, 6],
  ["Chinese", "Chicken Chilli", 19, 6],
  ["Chinese", "Chicken Manchurian", 21, 6],
  ["Chinese", "Momos", 23, 6],
  ["Burgers & Wraps", "Double Burger", 19, 6],
  ["Burgers & Wraps", "Italian Veg Burger", 24, 5],
  ["Burgers & Wraps", "Zinger Wrap", 15, 4],
  ["Burgers & Wraps", "Cheetos Club", 17, 4],
  ["Burgers & Wraps", "Zinger Paratha", 10, 3],
  ["Burgers & Wraps", "Hotdog Paratha", 8, 3],
  ["Drinks & Desserts", "Awar Al Khalb Juice", 19, 2],
  ["Drinks & Desserts", "Oreo Milk Shake", 16, 2],
  ["Drinks & Desserts", "Strawberry Milk Shake", 16, 2],
  ["Drinks & Desserts", "Ice Cappuccino", 15, 2],
  ["Drinks & Desserts", "Mocha", 15, 2],
  ["Drinks & Desserts", "Royal Falooda", 19, 3],
  ["Drinks & Desserts", "Mixed Ice Cream", 11, 2],
];

export const INITIAL_MENU: MenuItem[] = raw.map(([category, name, price, prep], i) => ({
  id: i + 1,
  category,
  name,
  price,
  prep,
  stock: prep >= 8 ? 10 : 20,
}));
export const CATEGORIES = [...new Set(raw.map((r) => r[0]))];

const POPULAR_NAMES = ["Arabic Shawarma", "Chicken Biryani", "Loaded Fries", "Oreo Milk Shake"];
export const POPULAR_ITEM_IDS: number[] = POPULAR_NAMES.map(
  (name) => INITIAL_MENU.find((item) => item.name === name)?.id,
).filter((id): id is number => id !== undefined);
