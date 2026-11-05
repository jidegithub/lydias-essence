import type { Product } from "../types/product";

export const sampleProducts: Product[] = [
  {
    id: "sample-017",
    name: "Golden Hour Hoops",
    category: "Jewellery",
    description:
      "Light, polished hoop earrings that go from morning to evening.",
    price: 24000,
    sale_price: null,
    stock: 14,
    image_url: null,
    image_urls: [],
    published: true,
    specifications: { finish: "Gold tone" }
  },
  {
    id: "sample-018",
    name: "Solstice Pendant Necklace",
    category: "Jewellery",
    description:
      "A delicate pendant on a fine chain, made for layering.",
    price: 36500,
    sale_price: 31000,
    stock: 8,
    image_url: null,
    image_urls: [],
    published: true,
    specifications: { finish: "Gold tone" }
  },
  {
    id: "sample-019",
    name: "Stacked Ring Set",
    category: "Jewellery",
    description:
      "Three slim rings designed to be worn together or apart.",
    price: 18000,
    sale_price: null,
    stock: 20,
    image_url: null,
    image_urls: [],
    published: true,
    specifications: { pieces: "3" }
  },
  {
    id: "sample-020",
    name: "Pearl Drop Earrings",
    category: "Jewellery",
    description:
      "Soft, luminous drops for a quietly elegant look.",
    price: 28500,
    sale_price: null,
    stock: 11,
    image_url: null,
    image_urls: [],
    published: true,
    specifications: { style: "Drop" }
  },
  {
    id: "sample-005",
    name: "Vanilla Reverie",
    category: "Perfumes",
    description:
      "A warm gourmand fragrance concept with soft vanilla-inspired notes.",
    price: 38000,
    sale_price: null,
    stock: 9,
    image_url: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=85",
    image_urls: [],
    published: true,
    specifications: { scentFamily: "Gourmand" }
  },
  {
    id: "sample-006",
    name: "Midnight Oud",
    category: "Perfumes",
    description:
      "A rich, evening-inspired fragrance concept with a sophisticated mood.",
    price: 52000,
    sale_price: 47000,
    stock: 7,
    image_url: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=85",
    image_urls: [],
    published: true,
    specifications: { scentFamily: "Woody" }
  },
  {
    id: "sample-007",
    name: "Petal & Silk",
    category: "Perfumes",
    description:
      "A soft floral fragrance concept inspired by delicate petals.",
    price: 32000,
    sale_price: null,
    stock: 14,
    image_url: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=85",
    image_urls: [],
    published: true,
    specifications: { scentFamily: "Floral" }
  },
  {
    id: "sample-008",
    name: "Bare Essence",
    category: "Perfumes",
    description:
      "A clean, understated fragrance concept for everyday wear.",
    price: 35000,
    sale_price: null,
    stock: 11,
    image_url: "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=900&q=85",
    image_urls: [],
    published: true,
    specifications: { scentFamily: "Fresh" }
  },
  {
    id: "sample-009",
    name: "Rosewater Lip Gloss",
    category: "Beauty",
    description:
      "A glossy rose-inspired lip look with an understated finish.",
    price: 8500,
    sale_price: null,
    stock: 30,
    image_url: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=85",
    image_urls: [],
    published: true,
    specifications: { finish: "Glossy" }
  },
  {
    id: "sample-010",
    name: "Silk Touch Body Butter",
    category: "Beauty",
    description:
      "A rich body-care concept for a pampering self-care ritual.",
    price: 14500,
    sale_price: null,
    stock: 16,
    image_url: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=85",
    image_urls: [],
    published: true,
    specifications: { routine: "Body care" }
  },
  {
    id: "sample-011",
    name: "The Everyday Brush Set",
    category: "Beauty",
    description:
      "A sample makeup brush collection for everyday beauty routines.",
    price: 19500,
    sale_price: 17500,
    stock: 8,
    image_url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=85",
    image_urls: [],
    published: true,
    specifications: { use: "Makeup application" }
  },
  {
    id: "sample-012",
    name: "Amber Glow Body Mist",
    category: "Beauty",
    description:
      "A light body-mist concept for a refreshing fragrance layer.",
    price: 11000,
    sale_price: null,
    stock: 21,
    image_url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=85",
    image_urls: [],
    published: true,
    specifications: { use: "Body fragrance" }
  },
  {
    id: "sample-013",
    name: "The Solis Sunglasses",
    category: "Glasses",
    description:
      "Classic sunglasses with a versatile, timeless silhouette.",
    price: 28500,
    sale_price: null,
    stock: 10,
    image_url: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85",
    image_urls: [],
    published: true,
    specifications: { style: "Classic sunglasses" }
  },
  {
    id: "sample-014",
    name: "Muse Oversized Frames",
    category: "Glasses",
    description:
      "Bold oversized frames designed to make a statement.",
    price: 32000,
    sale_price: null,
    stock: 6,
    image_url: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=900&q=85",
    image_urls: [],
    published: true,
    specifications: { style: "Oversized" }
  },
  {
    id: "sample-015",
    name: "The Amara Cat-Eye",
    category: "Glasses",
    description:
      "Elegant cat-eye frames with a playful, polished silhouette.",
    price: 26500,
    sale_price: null,
    stock: 13,
    image_url: "https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=900&q=85",
    image_urls: [],
    published: true,
    specifications: { style: "Cat-eye" }
  },
  {
    id: "sample-016",
    name: "Everyday Optical Frames",
    category: "Glasses",
    description:
      "Minimal everyday frames for a clean, versatile look.",
    price: 24000,
    sale_price: null,
    stock: 15,
    image_url: "https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=900&q=85",
    image_urls: [],
    published: true,
    specifications: { style: "Optical frames" }
  },
  {
    id: "sample-021",
    name: "Amber Reed Diffuser",
    category: "Home Scents",
    description:
      "A slow-release reed diffuser with warm amber notes for any room.",
    price: 21000,
    sale_price: null,
    stock: 16,
    image_url: null,
    image_urls: [],
    published: true,
    specifications: { format: "Reed diffuser" }
  },
  {
    id: "sample-022",
    name: "Linen & Sage Room Diffuser",
    category: "Home Scents",
    description:
      "A fresh, airy scent that makes a space feel instantly calm.",
    price: 19500,
    sale_price: null,
    stock: 12,
    image_url: null,
    image_urls: [],
    published: true,
    specifications: { format: "Reed diffuser" }
  },
  {
    id: "sample-023",
    name: "Fig Leaf Ultrasonic Diffuser",
    category: "Home Scents",
    description:
      "A quiet electric diffuser with a soft glow and a green, creamy fig scent.",
    price: 32000,
    sale_price: 27000,
    stock: 6,
    image_url: null,
    image_urls: [],
    published: true,
    specifications: { format: "Electric diffuser" }
  },
  {
    id: "sample-024",
    name: "Cedar Mist Diffuser",
    category: "Home Scents",
    description:
      "Woody, comforting and made for evenings in.",
    price: 23500,
    sale_price: null,
    stock: 9,
    image_url: null,
    image_urls: [],
    published: true,
    specifications: { format: "Reed diffuser" }
  }
];
