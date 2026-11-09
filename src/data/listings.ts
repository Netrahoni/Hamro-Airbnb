export type Listing = {
  id: string;
  name: string;
  city: string;
  area: string;
  type: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  tags: string[];
  description: string;
  host: string;
};

export const listings: Listing[] = [
  {
    id: 'pkr-lakeside-retreat',
    name: 'Lakeside Garden Retreat',
    city: 'Pokhara',
    area: 'Lakeside, Pokhara',
    type: 'Boutique stay',
    price: 6800,
    rating: 4.92,
    reviews: 128,
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=85',
    tags: ['Lake view', 'Breakfast', 'Garden'],
    description: 'A calm, design-led hideaway a short walk from the lake, with a leafy courtyard and warm local hospitality.',
    host: 'Aarav',
  },
  {
    id: 'ktm-heritage-courtyard',
    name: 'Heritage Courtyard House',
    city: 'Kathmandu',
    area: 'Patan, Kathmandu',
    type: 'Heritage home',
    price: 5200,
    rating: 4.88,
    reviews: 94,
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85',
    tags: ['Heritage', 'Workspace', 'Wi-Fi'],
    description: 'A thoughtfully restored home near Patan Durbar Square, blending traditional details with modern comfort.',
    host: 'Sanjana',
  },
  {
    id: 'pkr-mountain-view-lodge',
    name: 'Mountain View Lodge',
    city: 'Pokhara',
    area: 'Sarangkot, Pokhara',
    type: 'Mountain lodge',
    price: 7400,
    rating: 4.96,
    reviews: 76,
    image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=85',
    tags: ['Mountain view', 'Sunrise', 'Parking'],
    description: 'Wake up above the valley with open Himalayan views, a quiet terrace and locally prepared breakfasts.',
    host: 'Nima',
  },
  {
    id: 'ktm-boudha-studio',
    name: 'Boudha Quiet Studio',
    city: 'Kathmandu',
    area: 'Boudha, Kathmandu',
    type: 'Private studio',
    price: 3600,
    rating: 4.81,
    reviews: 61,
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85',
    tags: ['Quiet stay', 'Kitchenette', 'Wi-Fi'],
    description: 'A bright, practical studio in a peaceful neighbourhood, close to cafés and the Boudhanath area.',
    host: 'Prakriti',
  },
  {
    id: 'pkr-pine-ridge-homestay',
    name: 'Pine Ridge Homestay',
    city: 'Pokhara',
    area: 'Kaskikot, Pokhara',
    type: 'Homestay',
    price: 2900,
    rating: 4.97,
    reviews: 43,
    image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=85',
    tags: ['Local experience', 'Nature', 'Home-cooked meals'],
    description: 'A family-run hillside homestay with home-cooked food, garden paths and a slower pace of life.',
    host: 'Maya',
  },
  {
    id: 'ktm-thamel-design-hotel',
    name: 'Thamel Design Hotel',
    city: 'Kathmandu',
    area: 'Thamel, Kathmandu',
    type: 'Design hotel',
    price: 6100,
    rating: 4.86,
    reviews: 112,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85',
    tags: ['Central location', 'Restaurant', 'Power backup'],
    description: 'A comfortable contemporary base in the heart of the city, close to restaurants, shops and cultural sites.',
    host: 'Rijan',
  },
];
