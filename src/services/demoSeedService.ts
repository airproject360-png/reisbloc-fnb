/**
 * Demo Seed & Reset Service
 * Reisbloc POS - F&B Mexican Dark Kitchen & Restaurant Edition
 */

import { supabase } from '@/config/supabase'
import logger from '@/utils/logger'
import { User, Product } from '@/types'

export interface DemoIngredient {
  id: string
  name: string
  category: string
  unitType: 'kg' | 'liter' | 'units'
  currentStock: number
  reorderLevel: number
  wasteMarginPercent: number
  costPerUnit?: number
}

export interface DemoRecipeIngredient {
  ingredientId: string
  ingredientName?: string
  quantityRequired: number
  unitType?: string
  notes?: string
}

export interface DemoProduct extends Omit<Product, 'id'> {
  id: string
  recipeIngredients?: DemoRecipeIngredient[]
  estimatedPreparationTimeMinutes?: number
}

// 1. USUARIO ADMIN ÚNICO
export const DEMO_ADMIN_USER: User = {
  id: '504f4d91-02ea-4693-bb9a-993614a55f03',
  username: 'admin',
  role: 'admin',
  email: 'admin@localito.reisbloc.com',

  active: true,
  createdAt: new Date(),
  businessName: 'LOCALITO - Guisos & Barra Fría',
  organizationId: '1a70643e-23a3-4224-939e-d7daf381c083'
}


// 2. INVENTARIO COMPLETO DE INSUMOS & DESECHABLES DARK KITCHEN
export const DEMO_INGREDIENTS: DemoIngredient[] = [
  // Proteínas & Quesos
  { id: 'ing-01', name: 'Pechuga de Pollo Deshebrada', category: 'Proteínas', unitType: 'kg', currentStock: 35.0, reorderLevel: 5.0, wasteMarginPercent: 5, costPerUnit: 110 },
  { id: 'ing-02', name: 'Milanesa de Res Empanizada', category: 'Proteínas', unitType: 'kg', currentStock: 25.0, reorderLevel: 4.0, wasteMarginPercent: 4, costPerUnit: 140 },
  { id: 'ing-03', name: 'Carne de Cerdo al Pastor', category: 'Proteínas', unitType: 'kg', currentStock: 20.0, reorderLevel: 3.0, wasteMarginPercent: 5, costPerUnit: 130 },
  { id: 'ing-04', name: 'Huevo Fresco de Granja', category: 'Proteínas', unitType: 'units', currentStock: 360, reorderLevel: 60, wasteMarginPercent: 2, costPerUnit: 3.5 },
  { id: 'ing-05', name: 'Queso Oaxaca / Quesillo Rallado', category: 'Lácteos & Quesos', unitType: 'kg', currentStock: 15.0, reorderLevel: 3.0, wasteMarginPercent: 2, costPerUnit: 150 },
  { id: 'ing-06', name: 'Queso Manchego para Gratinar', category: 'Lácteos & Quesos', unitType: 'kg', currentStock: 12.0, reorderLevel: 2.5, wasteMarginPercent: 2, costPerUnit: 160 },
  { id: 'ing-07', name: 'Chorizo Artesanal de Cerdo', category: 'Proteínas', unitType: 'kg', currentStock: 10.0, reorderLevel: 2.0, wasteMarginPercent: 3, costPerUnit: 120 },

  // Masas, Tortillas & Panadería
  { id: 'ing-08', name: 'Tortilla de Maíz Nixtamalizada', category: 'Abarrotes & Masas', unitType: 'kg', currentStock: 50.0, reorderLevel: 10.0, wasteMarginPercent: 3, costPerUnit: 24 },
  { id: 'ing-09', name: 'Pan Bolillo Recién Horneado', category: 'Panadería', unitType: 'units', currentStock: 120, reorderLevel: 20, wasteMarginPercent: 2, costPerUnit: 4.5 },
  { id: 'ing-10', name: 'Totopos Crujientes de Maíz (Chilaquiles)', category: 'Abarrotes & Masas', unitType: 'kg', currentStock: 40.0, reorderLevel: 8.0, wasteMarginPercent: 4, costPerUnit: 45 },
  { id: 'ing-11', name: 'Frijol Negro Refrito Guisado', category: 'Abarrotes & Masas', unitType: 'kg', currentStock: 25.0, reorderLevel: 5.0, wasteMarginPercent: 2, costPerUnit: 35 },
  { id: 'ing-12', name: 'Aceite Vegetal de Cocina', category: 'Abarrotes & Masas', unitType: 'liter', currentStock: 40.0, reorderLevel: 8.0, wasteMarginPercent: 1, costPerUnit: 38 },

  // Salsas & Cremas Caseras
  { id: 'ing-33', name: 'Salsa Verde Tatemada de Tomatillo', category: 'Salsas & Cremas', unitType: 'liter', currentStock: 30.0, reorderLevel: 5.0, wasteMarginPercent: 2, costPerUnit: 30 },
  { id: 'ing-34', name: 'Salsa Roja Martajada de Chile de Árbol', category: 'Salsas & Cremas', unitType: 'liter', currentStock: 30.0, reorderLevel: 5.0, wasteMarginPercent: 2, costPerUnit: 32 },
  { id: 'ing-35', name: 'Crema Agria Fresca de Rancho', category: 'Lácteos & Quesos', unitType: 'kg', currentStock: 15.0, reorderLevel: 3.0, wasteMarginPercent: 2, costPerUnit: 65 },

  // Frutas & Verduras Saludables
  { id: 'ing-13', name: 'Aguacate Hass Maduro', category: 'Verduras & Saludables', unitType: 'kg', currentStock: 18.0, reorderLevel: 4.0, wasteMarginPercent: 6, costPerUnit: 70 },
  { id: 'ing-14', name: 'Jitomate Bola Fresco', category: 'Verduras & Saludables', unitType: 'kg', currentStock: 30.0, reorderLevel: 5.0, wasteMarginPercent: 4, costPerUnit: 28 },
  { id: 'ing-15', name: 'Cebolla Blanca Picada', category: 'Verduras & Saludables', unitType: 'kg', currentStock: 25.0, reorderLevel: 4.0, wasteMarginPercent: 3, costPerUnit: 20 },
  { id: 'ing-16', name: 'Nopal Fresco Orgánico', category: 'Verduras & Saludables', unitType: 'kg', currentStock: 15.0, reorderLevel: 3.0, wasteMarginPercent: 5, costPerUnit: 25 },
  { id: 'ing-17', name: 'Piña Miel Fresca', category: 'Frutas & Bebidas', unitType: 'kg', currentStock: 25.0, reorderLevel: 5.0, wasteMarginPercent: 8, costPerUnit: 22 },
  { id: 'ing-18', name: 'Apio & Espinaca Saludable', category: 'Verduras & Saludables', unitType: 'kg', currentStock: 10.0, reorderLevel: 2.0, wasteMarginPercent: 5, costPerUnit: 30 },
  { id: 'ing-19', name: 'Frutos Rojos (Fresas, Moras)', category: 'Frutas & Bebidas', unitType: 'kg', currentStock: 8.0, reorderLevel: 2.0, wasteMarginPercent: 5, costPerUnit: 90 },

  // Bebidas Base & Café
  { id: 'ing-20', name: 'Leche Entera de Vaca', category: 'Lácteos & Quesos', unitType: 'liter', currentStock: 60.0, reorderLevel: 10.0, wasteMarginPercent: 1, costPerUnit: 26 },
  { id: 'ing-21', name: 'Leche de Almendras (Sin Azúcar)', category: 'Lácteos & Quesos', unitType: 'liter', currentStock: 30.0, reorderLevel: 5.0, wasteMarginPercent: 1, costPerUnit: 42 },
  { id: 'ing-22', name: 'Concentrado de Jamaica con Chía', category: 'Bebidas Naturales', unitType: 'liter', currentStock: 40.0, reorderLevel: 8.0, wasteMarginPercent: 2, costPerUnit: 25 },
  { id: 'ing-23', name: 'Jarabe de Horchata Artesanal', category: 'Bebidas Naturales', unitType: 'liter', currentStock: 40.0, reorderLevel: 8.0, wasteMarginPercent: 2, costPerUnit: 25 },
  { id: 'ing-24', name: 'Café Arábico en Grano Mexicano', category: 'Café & Té', unitType: 'kg', currentStock: 15.0, reorderLevel: 3.0, wasteMarginPercent: 2, costPerUnit: 220 },
  { id: 'ing-25', name: 'Té Matcha Orgánico en Polvo', category: 'Café & Té', unitType: 'kg', currentStock: 3.0, reorderLevel: 0.5, wasteMarginPercent: 1, costPerUnit: 600 },

  // Baguettes Gourmet Insumos
  { id: 'ing-29', name: 'Pan Baguette Artesanal de Masa Madre', category: 'Panadería', unitType: 'units', currentStock: 80, reorderLevel: 15, wasteMarginPercent: 2, costPerUnit: 12 },
  { id: 'ing-30', name: 'Arrachera Marinada de Res', category: 'Proteínas', unitType: 'kg', currentStock: 20.0, reorderLevel: 4.0, wasteMarginPercent: 3, costPerUnit: 210 },
  { id: 'ing-31', name: 'Jamón Serrano Español', category: 'Proteínas', unitType: 'kg', currentStock: 10.0, reorderLevel: 2.0, wasteMarginPercent: 2, costPerUnit: 350 },
  { id: 'ing-32', name: 'Salsa Chimichurri & Pesto Casero', category: 'Salsas & Cremas', unitType: 'kg', currentStock: 8.0, reorderLevel: 1.5, wasteMarginPercent: 1, costPerUnit: 120 },

  // Empaques & Desechables Dark Kitchen (To-Go Packaging)
  { id: 'ing-26', name: 'Contenedor Térmico 9x9 Biodegradable', category: 'Empaques To-Go', unitType: 'units', currentStock: 500, reorderLevel: 100, wasteMarginPercent: 1, costPerUnit: 3.8 },
  { id: 'ing-27', name: 'Vaso para Bebidas 600ml con Tapa Domo', category: 'Empaques To-Go', unitType: 'units', currentStock: 600, reorderLevel: 100, wasteMarginPercent: 1, costPerUnit: 2.9 },
  { id: 'ing-28', name: 'Set de Cubiertos & Servilleta Biodegradable', category: 'Empaques To-Go', unitType: 'units', currentStock: 500, reorderLevel: 100, wasteMarginPercent: 1, costPerUnit: 1.5 },
  { id: 'ing-36', name: 'Bote para Salsa / Crema 2oz con Tapa', category: 'Empaques To-Go', unitType: 'units', currentStock: 800, reorderLevel: 150, wasteMarginPercent: 1, costPerUnit: 0.9 },
  { id: 'ing-37', name: 'Bolsa de Papel Kraft Dark Kitchen To-Go', category: 'Empaques To-Go', unitType: 'units', currentStock: 500, reorderLevel: 100, wasteMarginPercent: 1, costPerUnit: 2.2 }
]

// 3. PRODUCTOS DEL MENÚ CON RECETAS DE GUISOS & BARRA FRÍA LOCALITO
export const DEMO_PRODUCTS: DemoProduct[] = [
  // --- GUISOS DEL DÍA (LOCALITO) ---
  {
    id: 'prod-gui-01',
    name: 'Cazuela de Guisado del Día con Arroz y Frijoles',
    description: 'Especialidad LOCALITO: Elige tu guisado artesanal favorito (Chicharrón en salsa verde, Cochinita Pibil o Tinga de Pollo) acompañado de arroz mexicano, frijoles refritos y tortillas hechas a mano.',
    price: 125,
    category: 'Guisos',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-03', ingredientName: 'Carne de Cerdo / Guisado', quantityRequired: 0.20, unitType: 'kg' },
      { ingredientId: 'ing-11', ingredientName: 'Frijol Negro Refrito', quantityRequired: 0.12, unitType: 'kg' },
      { ingredientId: 'ing-08', ingredientName: 'Tortilla de Maíz', quantityRequired: 0.10, unitType: 'kg' }
    ]
  },
  {
    id: 'prod-gui-02',
    name: 'Tacos de Guisado Fiesteros (Orden de 3)',
    description: 'Tres tacos bien servidos en doble tortilla de maíz nixtamalizado con tus guisados a elegir de la barra caliente, coronados con frijolitos y salsa de la casa.',
    price: 110,
    category: 'Guisos',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-08', ingredientName: 'Tortilla de Maíz', quantityRequired: 0.15, unitType: 'kg' },
      { ingredientId: 'ing-01', ingredientName: 'Pechuga / Guisado', quantityRequired: 0.18, unitType: 'kg' }
    ]
  },

  // --- BARRA FRÍA (LOCALITO) ---
  {
    id: 'prod-bf-01',
    name: 'Ceviche Fresco de Barra Fría con Totopos',
    description: 'Directo de la Barra Fría LOCALITO: Filete de pescado fresco marinado en limón con jitomate bola, cebolla morada, cilantro, aguacate Hass y totopos horneados.',
    price: 145,
    category: 'Barra Fría',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-13', ingredientName: 'Aguacate Hass Maduro', quantityRequired: 0.08, unitType: 'kg' },
      { ingredientId: 'ing-10', ingredientName: 'Totopos Crujientes', quantityRequired: 0.15, unitType: 'kg' }
    ]
  },
  {
    id: 'prod-bf-02',
    name: 'Ensalada Barra Fría con Pollo a las Hierbas',
    description: 'Mezcla de lechugas frescas, espinacas, jitomate cherry, aguacate, queso manchego en cubos y 150g de pechuga a la plancha con aderezo casero.',
    price: 130,
    category: 'Barra Fría',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-01', ingredientName: 'Pechuga de Pollo', quantityRequired: 0.15, unitType: 'kg' },
      { ingredientId: 'ing-18', ingredientName: 'Apio & Espinaca', quantityRequired: 0.12, unitType: 'kg' },
      { ingredientId: 'ing-13', ingredientName: 'Aguacate Hass', quantityRequired: 0.06, unitType: 'kg' }
    ]
  },


  {
    id: 'prod-des-01',
    name: 'Chilaquiles Verdes o Rojos con Pollo/Huevo',
    description: 'Receta Dark Kitchen: 250g totopos crujientes de maíz, 180ml de salsa verde tatemada o roja martajada, 120g pechuga deshebrada, crema agria, queso oaxaca, cebolla y empaque térmico to-go.',
    price: 135,
    category: 'Desayunos',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1640719028782-9334b082670d?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-10', ingredientName: 'Totopos Crujientes de Maíz', quantityRequired: 0.25, unitType: 'kg', notes: 'Totopos fritos en aceite limpio' },
      { ingredientId: 'ing-33', ingredientName: 'Salsa Verde Tatemada', quantityRequired: 0.18, unitType: 'liter', notes: 'Salsa verde o roja según elección' },
      { ingredientId: 'ing-01', ingredientName: 'Pechuga de Pollo Deshebrada', quantityRequired: 0.12, unitType: 'kg', notes: 'Pollo sazonado' },
      { ingredientId: 'ing-05', ingredientName: 'Queso Oaxaca Rallado', quantityRequired: 0.04, unitType: 'kg' },
      { ingredientId: 'ing-35', ingredientName: 'Crema Agria de Rancho', quantityRequired: 0.03, unitType: 'kg' },
      { ingredientId: 'ing-26', ingredientName: 'Contenedor Térmico 9x9', quantityRequired: 1, unitType: 'units' },
      { ingredientId: 'ing-36', ingredientName: 'Bote Salsa 2oz', quantityRequired: 1, unitType: 'units' },
      { ingredientId: 'ing-37', ingredientName: 'Bolsa Kraft To-Go', quantityRequired: 1, unitType: 'units' }
    ]
  },
  {
    id: 'prod-des-02',
    name: 'Huevos Rancheros sobre Tortilla de Maíz Frita',
    description: 'Dos huevos fritos sobre tortillas pasadas por aceite caliente, bañados en salsa ranchera casera con 150g frijoles negros refritos.',
    price: 110,
    category: 'Desayunos',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-04', ingredientName: 'Huevo Fresco de Granja', quantityRequired: 2, unitType: 'units' },
      { ingredientId: 'ing-08', ingredientName: 'Tortilla de Maíz', quantityRequired: 0.08, unitType: 'kg' },
      { ingredientId: 'ing-11', ingredientName: 'Frijol Negro Refrito', quantityRequired: 0.15, unitType: 'kg' },
      { ingredientId: 'ing-34', ingredientName: 'Salsa Roja Martajada', quantityRequired: 0.10, unitType: 'liter' },
      { ingredientId: 'ing-26', ingredientName: 'Contenedor Térmico 9x9', quantityRequired: 1, unitType: 'units' }
    ]
  },
  {
    id: 'prod-des-03',
    name: 'Molletes con Chorizo y Pico de Gallo',
    description: 'Dos tapas de pan bolillo crujiente cubiertas con frijoles negros refritos, quesillo derretido, 60g chorizo artesanal y pico de gallo fiestero.',
    price: 95,
    category: 'Desayunos',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-09', ingredientName: 'Pan Bolillo Recién Horneado', quantityRequired: 1, unitType: 'units' },
      { ingredientId: 'ing-11', ingredientName: 'Frijol Negro Refrito', quantityRequired: 0.10, unitType: 'kg' },
      { ingredientId: 'ing-05', ingredientName: 'Queso Oaxaca Rallado', quantityRequired: 0.06, unitType: 'kg' },
      { ingredientId: 'ing-07', ingredientName: 'Chorizo Artesanal', quantityRequired: 0.06, unitType: 'kg' },
      { ingredientId: 'ing-26', ingredientName: 'Contenedor Térmico 9x9', quantityRequired: 1, unitType: 'units' }
    ]
  },
  {
    id: 'prod-des-04',
    name: 'Omelette Vegetariano Saludable',
    description: 'Tres huevos batidos con nopal tierno, espinacas, champiñones y 60g de aguacate Hass maduro.',
    price: 120,
    category: 'Desayunos',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-04', ingredientName: 'Huevo Fresco de Granja', quantityRequired: 3, unitType: 'units' },
      { ingredientId: 'ing-16', ingredientName: 'Nopal Fresco Orgánico', quantityRequired: 0.08, unitType: 'kg' },
      { ingredientId: 'ing-13', ingredientName: 'Aguacate Hass Maduro', quantityRequired: 0.06, unitType: 'kg' },
      { ingredientId: 'ing-26', ingredientName: 'Contenedor Térmico 9x9', quantityRequired: 1, unitType: 'units' }
    ]
  },

  // --- BAGUETTES GOURMET ---
  {
    id: 'prod-bag-01',
    name: 'Baguette de Arrachera al Chimichurri & Queso',
    description: '1 Pieza baguette artesanal de masa madre relleno de 160g arrachera jugosa a la plancha, quesillo oaxaca derretido, cebolla asada y chimichurri casero.',
    price: 155,
    category: 'Comidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-29', ingredientName: 'Pan Baguette Artesanal', quantityRequired: 1, unitType: 'units' },
      { ingredientId: 'ing-30', ingredientName: 'Arrachera Marinada de Res', quantityRequired: 0.16, unitType: 'kg' },
      { ingredientId: 'ing-05', ingredientName: 'Queso Oaxaca Rallado', quantityRequired: 0.05, unitType: 'kg' },
      { ingredientId: 'ing-32', ingredientName: 'Salsa Chimichurri Casero', quantityRequired: 0.03, unitType: 'kg' },
      { ingredientId: 'ing-26', ingredientName: 'Contenedor Térmico 9x9', quantityRequired: 1, unitType: 'units' }
    ]
  },
  {
    id: 'prod-bag-02',
    name: 'Baguette Jamón Serrano con Queso Manchego & Pesto',
    description: 'Baguette artesanal recién horneado con 100g finas lajas de jamón serrano español, queso manchego gratinado y pesto casero de albahaca.',
    price: 145,
    category: 'Comidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-29', ingredientName: 'Pan Baguette Artesanal', quantityRequired: 1, unitType: 'units' },
      { ingredientId: 'ing-31', ingredientName: 'Jamón Serrano Español', quantityRequired: 0.10, unitType: 'kg' },
      { ingredientId: 'ing-06', ingredientName: 'Queso Manchego Gratinar', quantityRequired: 0.05, unitType: 'kg' },
      { ingredientId: 'ing-32', ingredientName: 'Pesto Casero de Albahaca', quantityRequired: 0.03, unitType: 'kg' },
      { ingredientId: 'ing-26', ingredientName: 'Contenedor Térmico 9x9', quantityRequired: 1, unitType: 'units' }
    ]
  },

  // --- COMIDAS (LUNCH) ---
  {
    id: 'prod-com-01',
    name: 'Torta de Milanesa de Res Especial',
    description: 'Pan bolillo dorado con 150g milanesa empanizada de res, quesillo oaxaca, aguacate hass, jitomate y frijoles negros.',
    price: 130,
    category: 'Comidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-09', ingredientName: 'Pan Bolillo Recién Horneado', quantityRequired: 1, unitType: 'units' },
      { ingredientId: 'ing-02', ingredientName: 'Milanesa de Res Empanizada', quantityRequired: 0.15, unitType: 'kg' },
      { ingredientId: 'ing-05', ingredientName: 'Queso Oaxaca Rallado', quantityRequired: 0.05, unitType: 'kg' },
      { ingredientId: 'ing-13', ingredientName: 'Aguacate Hass Maduro', quantityRequired: 0.04, unitType: 'kg' },
      { ingredientId: 'ing-26', ingredientName: 'Contenedor Térmico 9x9', quantityRequired: 1, unitType: 'units' }
    ]
  },
  {
    id: 'prod-com-02',
    name: 'Tacos de Guisado para Llevar (Orden de 4)',
    description: 'Orden de 4 tacos sobre tortilla de maíz doble nixtamalizada con 180g guisado (Chicharrón, Tinga o Pollo) y empaque biodegradable.',
    price: 115,
    category: 'Comidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-08', ingredientName: 'Tortilla de Maíz', quantityRequired: 0.20, unitType: 'kg' },
      { ingredientId: 'ing-01', ingredientName: 'Pechuga de Pollo Deshebrada', quantityRequired: 0.18, unitType: 'kg' },
      { ingredientId: 'ing-26', ingredientName: 'Contenedor Térmico 9x9', quantityRequired: 1, unitType: 'units' }
    ]
  },
  {
    id: 'prod-com-03',
    name: 'Flautas Doradas de Pollo (4 pzs)',
    description: 'Cuatro flautas crujientes rellenas de pechuga deshebrada, cubiertas con crema agria, queso fresco, lechuga y salsa verde.',
    price: 125,
    category: 'Comidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-08', ingredientName: 'Tortilla de Maíz', quantityRequired: 0.15, unitType: 'kg' },
      { ingredientId: 'ing-01', ingredientName: 'Pechuga de Pollo Deshebrada', quantityRequired: 0.12, unitType: 'kg' },
      { ingredientId: 'ing-05', ingredientName: 'Queso Oaxaca Rallado', quantityRequired: 0.03, unitType: 'kg' },
      { ingredientId: 'ing-35', ingredientName: 'Crema Agria Fresca', quantityRequired: 0.03, unitType: 'kg' },
      { ingredientId: 'ing-26', ingredientName: 'Contenedor Térmico 9x9', quantityRequired: 1, unitType: 'units' }
    ]
  },
  {
    id: 'prod-com-04',
    name: 'Ceviche Acapulqueño de Pesca del Día',
    description: 'Pescado blanco marinado en limón agrio con jitomate, cebolla morada, cilantro, aguacate hass y tostadas crujientes.',
    price: 165,
    category: 'Comidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1535400255456-984241443b29?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-14', ingredientName: 'Jitomate Bola Fresco', quantityRequired: 0.10, unitType: 'kg' },
      { ingredientId: 'ing-15', ingredientName: 'Cebolla Blanca Picada', quantityRequired: 0.05, unitType: 'kg' },
      { ingredientId: 'ing-13', ingredientName: 'Aguacate Hass Maduro', quantityRequired: 0.06, unitType: 'kg' },
      { ingredientId: 'ing-26', ingredientName: 'Contenedor Térmico 9x9', quantityRequired: 1, unitType: 'units' }
    ]
  },

  // --- CENAS & TACOS ---
  {
    id: 'prod-cen-01',
    name: 'Enchiladas Suizas de Pollo (3 pzs)',
    description: 'Tres tortillas rellenas de pollo deshebrado bañadas en salsa verde cremosa, gratinadas con abundante queso manchego.',
    price: 145,
    category: 'Cenas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-08', ingredientName: 'Tortilla de Maíz', quantityRequired: 0.12, unitType: 'kg' },
      { ingredientId: 'ing-01', ingredientName: 'Pechuga de Pollo Deshebrada', quantityRequired: 0.12, unitType: 'kg' },
      { ingredientId: 'ing-06', ingredientName: 'Queso Manchego Gratinar', quantityRequired: 0.06, unitType: 'kg' },
      { ingredientId: 'ing-33', ingredientName: 'Salsa Verde Tatemada', quantityRequired: 0.15, unitType: 'liter' },
      { ingredientId: 'ing-26', ingredientName: 'Contenedor Térmico 9x9', quantityRequired: 1, unitType: 'units' }
    ]
  },
  {
    id: 'prod-cen-02',
    name: 'Tacos al Pastor con Queso Derretido',
    description: '180g carne de cerdo marinada al pastor con piña asada, cebolla, cilantro y quesillo gratinado sobre tortilla doble.',
    price: 135,
    category: 'Cenas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-03', ingredientName: 'Carne de Cerdo al Pastor', quantityRequired: 0.18, unitType: 'kg' },
      { ingredientId: 'ing-08', ingredientName: 'Tortilla de Maíz', quantityRequired: 0.15, unitType: 'kg' },
      { ingredientId: 'ing-05', ingredientName: 'Queso Oaxaca Rallado', quantityRequired: 0.04, unitType: 'kg' },
      { ingredientId: 'ing-26', ingredientName: 'Contenedor Térmico 9x9', quantityRequired: 1, unitType: 'units' }
    ]
  },

  // --- BEBIDAS NATURALES & SALUDABLES ---
  {
    id: 'prod-beb-01',
    name: 'Agua Fresca de Horchata Artesanal (600ml)',
    description: 'Elaborada artesanalmente con arroz seleccionado, canela de raja entera, leche y toque de vainilla.',
    price: 45,
    category: 'Bebidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-23', ingredientName: 'Jarabe de Horchata', quantityRequired: 0.20, unitType: 'liter' },
      { ingredientId: 'ing-27', ingredientName: 'Vaso 600ml con Tapa Domo', quantityRequired: 1, unitType: 'units' }
    ]
  },
  {
    id: 'prod-beb-02',
    name: 'Agua Fresca de Jamaica con Chía (600ml)',
    description: 'Infusión natural de flor de jamaica sin azúcar refinada, enriquecida con semillas de chía orgánicas.',
    price: 45,
    category: 'Bebidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-22', ingredientName: 'Concentrado de Jamaica con Chía', quantityRequired: 0.20, unitType: 'liter' },
      { ingredientId: 'ing-27', ingredientName: 'Vaso 600ml con Tapa Domo', quantityRequired: 1, unitType: 'units' }
    ]
  },
  {
    id: 'prod-beb-03',
    name: 'Jugo Verde Detox Natural (500ml)',
    description: 'Extracción fresca al momento de nopal orgánico, piña miel, apio, espinaca y jugo de limón agrio.',
    price: 55,
    category: 'Bebidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-16', ingredientName: 'Nopal Fresco Orgánico', quantityRequired: 0.05, unitType: 'kg' },
      { ingredientId: 'ing-17', ingredientName: 'Piña Miel Fresca', quantityRequired: 0.10, unitType: 'kg' },
      { ingredientId: 'ing-18', ingredientName: 'Apio & Espinaca', quantityRequired: 0.05, unitType: 'kg' },
      { ingredientId: 'ing-27', ingredientName: 'Vaso 600ml con Tapa Domo', quantityRequired: 1, unitType: 'units' }
    ]
  },
  {
    id: 'prod-beb-04',
    name: 'Café de Olla Tradicional con Canela',
    description: 'Café en grano arábico mexicano preparado artesanalmente en olla de barro con piloncillo y canela.',
    price: 40,
    category: 'Bebidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-24', ingredientName: 'Café Arábico en Grano', quantityRequired: 0.02, unitType: 'kg' }
    ]
  },
  {
    id: 'prod-beb-05',
    name: 'Matcha Latte Saludable (Leche de Almendra)',
    description: 'Té verde matcha orgánico en polvo batido al momento con leche de almendra baja en calorías.',
    price: 60,
    category: 'Bebidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-25', ingredientName: 'Té Matcha Orgánico', quantityRequired: 0.005, unitType: 'kg' },
      { ingredientId: 'ing-21', ingredientName: 'Leche de Almendras', quantityRequired: 0.25, unitType: 'liter' }
    ]
  },

  // --- COMBOS PARA LLEVAR (TO-GO COMBOS) ---
  {
    id: 'prod-cmb-01',
    name: 'Combo Desayuno Ejecutivo (Para llevar)',
    description: 'Incluye Chilaquiles Verdes/Rojos con Pollo + Café de Olla + Vaso de Jugo Verde Detox + Empaque ecológico.',
    price: 165,
    category: 'Combos',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-10', ingredientName: 'Totopos Crujientes de Maíz', quantityRequired: 0.15, unitType: 'kg' },
      { ingredientId: 'ing-01', ingredientName: 'Pechuga de Pollo Deshebrada', quantityRequired: 0.10, unitType: 'kg' },
      { ingredientId: 'ing-24', ingredientName: 'Café Arábico en Grano', quantityRequired: 0.02, unitType: 'kg' },
      { ingredientId: 'ing-26', ingredientName: 'Contenedor Térmico 9x9', quantityRequired: 1, unitType: 'units' },
      { ingredientId: 'ing-27', ingredientName: 'Vaso 600ml con Tapa Domo', quantityRequired: 1, unitType: 'units' }
    ]
  },
  {
    id: 'prod-cmb-02',
    name: 'Combo Chilango Ejecutivo To-Go',
    description: '¡El favorito de la casa! Torta Especial de Milanesa con Quesillo + Agua Fresca de Horchata o Jamaica (600ml) + Flan Nápolitano Cremoso + Empaque To-Go.',
    price: 175,
    category: 'Combos',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-09', ingredientName: 'Pan Bolillo Recién Horneado', quantityRequired: 1, unitType: 'units' },
      { ingredientId: 'ing-02', ingredientName: 'Milanesa de Res Empanizada', quantityRequired: 0.15, unitType: 'kg' },
      { ingredientId: 'ing-23', ingredientName: 'Jarabe de Horchata', quantityRequired: 0.20, unitType: 'liter' },
      { ingredientId: 'ing-26', ingredientName: 'Contenedor Térmico 9x9', quantityRequired: 1, unitType: 'units' },
      { ingredientId: 'ing-27', ingredientName: 'Vaso 600ml con Tapa Domo', quantityRequired: 1, unitType: 'units' }
    ]
  },

  // --- POSTRES ---
  {
    id: 'prod-pos-01',
    name: 'Flan Nápolitano Cremoso',
    description: 'Flan casero suave de vainilla horneado con caramelo líquido de la casa.',
    price: 50,
    category: 'Postres',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=800&auto=format&fit=crop'
  },
  {
    id: 'prod-pos-02',
    name: 'Cheesecake con Mermelada de Frutos Rojos',
    description: 'Rebanada de pastel de queso cremoso cubierto con mermelada artesanal de frutos rojos.',
    price: 65,
    category: 'Postres',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-19', ingredientName: 'Frutos Rojos (Fresas, Moras)', quantityRequired: 0.05, unitType: 'kg' }
    ]
  }
]

class DemoSeedService {
  async resetAndSeedFnBDemoData(): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('demo-seed', '🌱 Iniciando reinicio de base de datos para Demo F&B México & Dark Kitchen...')

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('reisbloc_demo_ingredients', JSON.stringify(DEMO_INGREDIENTS))
        localStorage.setItem('reisbloc_demo_products', JSON.stringify(DEMO_PRODUCTS))
        localStorage.setItem('reisbloc_demo_users', JSON.stringify([DEMO_ADMIN_USER]))
      }

      try {
        await supabase.from('users').upsert([{
          id: DEMO_ADMIN_USER.id,
          username: DEMO_ADMIN_USER.username,
          pin: DEMO_ADMIN_USER.pin,
          role: DEMO_ADMIN_USER.role,
          email: DEMO_ADMIN_USER.email,
          active: true
        }], { onConflict: 'username' })

        const dbProducts = DEMO_PRODUCTS.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          available: p.active,
          has_inventory: p.hasInventory,
          image_path: p.imageUrl
        }))

        await supabase.from('products').upsert(dbProducts, { onConflict: 'id' })
      } catch (errDb) {
        logger.warn('demo-seed', 'Modo offline / Supabase sin tablas remotas directas. Datos locales de demostración listos.', errDb)
      }

      logger.info('demo-seed', '✅ Reinicio completado exitosamente.')
      return {
        success: true,
        message: 'Base de datos Dark Kitchen F&B reiniciada con éxito: Recetas con totopos (250g), pollo (120g), salsas, empacado To-Go y fotografías auténticas de México.'
      }
    } catch (error: any) {
      logger.error('demo-seed', 'Error en reinicio de demo F&B', error)
      return {
        success: false,
        message: `Error al reiniciar: ${error?.message || String(error)}`
      }
    }
  }
}

export const demoSeedService = new DemoSeedService()
export default demoSeedService
