/**
 * Demo Seed & Reset Service
 * Reisbloc POS - F&B Mexican Restaurant, Cafe & To-Go Edition
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
}

export interface DemoRecipeIngredient {
  ingredientId: string
  quantityRequired: number
}

export interface DemoProduct extends Omit<Product, 'id'> {
  id: string
  recipeIngredients?: DemoRecipeIngredient[]
}

// 1. USUARIO ADMIN ÚNICO
export const DEMO_ADMIN_USER: User = {
  id: 'usr-admin-demo-1',
  username: 'admin',
  pin: '1234',
  role: 'admin',
  email: 'admin@reisbloc.com',
  active: true,
  createdAt: new Date(),
  businessName: 'Reisbloc F&B - Restaurante & Café'
}

// 2. INVENTARIO DE INSUMOS (INGREDIENTS)
export const DEMO_INGREDIENTS: DemoIngredient[] = [
  // Proteínas & Quesos
  { id: 'ing-01', name: 'Pechuga de Pollo Fresca', category: 'Proteínas', unitType: 'kg', currentStock: 35.0, reorderLevel: 5.0, wasteMarginPercent: 5 },
  { id: 'ing-02', name: 'Milanesa de Res', category: 'Proteínas', unitType: 'kg', currentStock: 25.0, reorderLevel: 4.0, wasteMarginPercent: 4 },
  { id: 'ing-03', name: 'Carne de Cerdo al Pastor', category: 'Proteínas', unitType: 'kg', currentStock: 20.0, reorderLevel: 3.0, wasteMarginPercent: 5 },
  { id: 'ing-04', name: 'Huevo Fresco de Granja', category: 'Proteínas', unitType: 'units', currentStock: 360, reorderLevel: 60, wasteMarginPercent: 2 },
  { id: 'ing-05', name: 'Queso Oaxaca / Quesillo', category: 'Lácteos & Quesos', unitType: 'kg', currentStock: 15.0, reorderLevel: 3.0, wasteMarginPercent: 2 },
  { id: 'ing-06', name: 'Queso Manchego para Gratinar', category: 'Lácteos & Quesos', unitType: 'kg', currentStock: 12.0, reorderLevel: 2.5, wasteMarginPercent: 2 },
  { id: 'ing-07', name: 'Chorizo Artesanal', category: 'Proteínas', unitType: 'kg', currentStock: 10.0, reorderLevel: 2.0, wasteMarginPercent: 3 },

  // Abarrotes & Masas
  { id: 'ing-08', name: 'Tortilla de Maíz Nixtamalizada', category: 'Abarrotes & Masas', unitType: 'kg', currentStock: 50.0, reorderLevel: 10.0, wasteMarginPercent: 3 },
  { id: 'ing-09', name: 'Pan Bolillo Recién Horneado', category: 'Panadería', unitType: 'units', currentStock: 120, reorderLevel: 20, wasteMarginPercent: 2 },
  { id: 'ing-10', name: 'Totopos Crujientes de Maíz', category: 'Abarrotes & Masas', unitType: 'kg', currentStock: 30.0, reorderLevel: 5.0, wasteMarginPercent: 5 },
  { id: 'ing-11', name: 'Frijol Negro Refrito preparado', category: 'Abarrotes & Masas', unitType: 'kg', currentStock: 25.0, reorderLevel: 5.0, wasteMarginPercent: 2 },
  { id: 'ing-12', name: 'Aceite Vegetal de Cocina', category: 'Abarrotes & Masas', unitType: 'liter', currentStock: 40.0, reorderLevel: 8.0, wasteMarginPercent: 1 },

  // Frutas & Verduras Saludables
  { id: 'ing-13', name: 'Aguacate Hass Maduro', category: 'Verduras & Saludables', unitType: 'kg', currentStock: 18.0, reorderLevel: 4.0, wasteMarginPercent: 6 },
  { id: 'ing-14', name: 'Jitomate Bola', category: 'Verduras & Saludables', unitType: 'kg', currentStock: 30.0, reorderLevel: 5.0, wasteMarginPercent: 4 },
  { id: 'ing-15', name: 'Cebolla Blanca', category: 'Verduras & Saludables', unitType: 'kg', currentStock: 25.0, reorderLevel: 4.0, wasteMarginPercent: 3 },
  { id: 'ing-16', name: 'Nopal Fresco Orgánico', category: 'Verduras & Saludables', unitType: 'kg', currentStock: 15.0, reorderLevel: 3.0, wasteMarginPercent: 5 },
  { id: 'ing-17', name: 'Piña Miel Fresca', category: 'Frutas & Bebidas', unitType: 'kg', currentStock: 25.0, reorderLevel: 5.0, wasteMarginPercent: 8 },
  { id: 'ing-18', name: 'Apio & Espinaca Saludable', category: 'Verduras & Saludables', unitType: 'kg', currentStock: 10.0, reorderLevel: 2.0, wasteMarginPercent: 5 },
  { id: 'ing-19', name: 'Frutos Rojos (Fresas, Moras)', category: 'Frutas & Bebidas', unitType: 'kg', currentStock: 8.0, reorderLevel: 2.0, wasteMarginPercent: 5 },

  // Lácteos & Bebidas Base
  { id: 'ing-20', name: 'Leche Entera de Vaca', category: 'Lácteos & Quesos', unitType: 'liter', currentStock: 60.0, reorderLevel: 10.0, wasteMarginPercent: 1 },
  { id: 'ing-21', name: 'Leche de Almendras (Sin Azúcar)', category: 'Lácteos & Quesos', unitType: 'liter', currentStock: 30.0, reorderLevel: 5.0, wasteMarginPercent: 1 },
  { id: 'ing-22', name: 'Concentrado de Jamaica con Chía', category: 'Bebidas Naturales', unitType: 'liter', currentStock: 40.0, reorderLevel: 8.0, wasteMarginPercent: 2 },
  { id: 'ing-23', name: 'Jarabe de Horchata Artesanal', category: 'Bebidas Naturales', unitType: 'liter', currentStock: 40.0, reorderLevel: 8.0, wasteMarginPercent: 2 },
  { id: 'ing-24', name: 'Café Arábico en Grano Mexicano', category: 'Café & Té', unitType: 'kg', currentStock: 15.0, reorderLevel: 3.0, wasteMarginPercent: 2 },
  { id: 'ing-25', name: 'Té Matcha Orgánico en Polvo', category: 'Café & Té', unitType: 'kg', currentStock: 3.0, reorderLevel: 0.5, wasteMarginPercent: 1 },

  // Empaques para Llevar (To-Go)
  { id: 'ing-26', name: 'Contenedor Térmico para Llevar', category: 'Empaques To-Go', unitType: 'units', currentStock: 500, reorderLevel: 100, wasteMarginPercent: 1 },
  { id: 'ing-27', name: 'Vaso con Tapa para Bebidas 600ml', category: 'Empaques To-Go', unitType: 'units', currentStock: 600, reorderLevel: 100, wasteMarginPercent: 1 },
  { id: 'ing-28', name: 'Set de Cubiertos & Servilletas', category: 'Empaques To-Go', unitType: 'units', currentStock: 500, reorderLevel: 100, wasteMarginPercent: 1 }
]

// 3. PRODUCTOS DEL MENÚ CON RECETAS E INSUMOS ASOCIADOS Y FOTOS ALTA RESOLUCIÓN
export const DEMO_PRODUCTS: DemoProduct[] = [
  // --- DESAYUNOS ---
  {
    id: 'prod-des-01',
    name: 'Chilaquiles Verdes o Rojos con Pollo/Huevo',
    description: 'Totopos crujientes bañados en salsa verde o roja recién hecha, crema, queso fresco, cebolla y proteína a elegir.',
    price: 135,
    category: 'Desayunos',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1599789197514-47270cd526b4?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-10', quantityRequired: 0.15 },
      { ingredientId: 'ing-01', quantityRequired: 0.10 },
      { ingredientId: 'ing-05', quantityRequired: 0.03 }
    ]
  },
  {
    id: 'prod-des-02',
    name: 'Huevos Rancheros sobre Tortilla Frita',
    description: 'Dos huevos estrellados de granja sobre tortillas pasadas por aceite, bañados en salsa ranchera caliente y frijoles refritos.',
    price: 110,
    category: 'Desayunos',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-04', quantityRequired: 2 },
      { ingredientId: 'ing-08', quantityRequired: 0.08 },
      { ingredientId: 'ing-11', quantityRequired: 0.10 }
    ]
  },
  {
    id: 'prod-des-03',
    name: 'Molletes con Chorizo y Pico de Gallo',
    description: 'Bolillo crujiente preparado con frijoles negros refritos, queso oaxaca derretido, chorizo artesanal y pico de gallo.',
    price: 95,
    category: 'Desayunos',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-09', quantityRequired: 1 },
      { ingredientId: 'ing-11', quantityRequired: 0.08 },
      { ingredientId: 'ing-05', quantityRequired: 0.05 },
      { ingredientId: 'ing-07', quantityRequired: 0.04 }
    ]
  },
  {
    id: 'prod-des-04',
    name: 'Omelette Vegetariano Saludable',
    description: 'Omelette preparado con claras u huevo entero, relleno de nopal tierno, espinacas, champiñones y rebanadas de aguacate.',
    price: 120,
    category: 'Desayunos',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-04', quantityRequired: 3 },
      { ingredientId: 'ing-16', quantityRequired: 0.08 },
      { ingredientId: 'ing-13', quantityRequired: 0.05 }
    ]
  },

  // --- COMIDAS (LUNCH) ---
  {
    id: 'prod-com-01',
    name: 'Torta de Milanesa de Res Especial',
    description: 'Pan bolillo dorado con abundante milanesa empanizada, quesillo oaxaca, aguacate, jitomate y frijoles negros.',
    price: 130,
    category: 'Comidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-09', quantityRequired: 1 },
      { ingredientId: 'ing-02', quantityRequired: 0.15 },
      { ingredientId: 'ing-05', quantityRequired: 0.05 },
      { ingredientId: 'ing-13', quantityRequired: 0.04 }
    ]
  },
  {
    id: 'prod-com-02',
    name: 'Tacos de Guisado para Llevar (Orden de 4)',
    description: 'Cuatro tacos de guisado tradicional (Chicharrón, Tinga, Pollo o Picadillo) servidos en tortilla caliente doble.',
    price: 115,
    category: 'Comidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-08', quantityRequired: 0.20 },
      { ingredientId: 'ing-01', quantityRequired: 0.15 },
      { ingredientId: 'ing-26', quantityRequired: 1 }
    ]
  },
  {
    id: 'prod-com-03',
    name: 'Flautas Doradas de Pollo (4 pzs)',
    description: 'Flautas crujientes rellenas de pechuga deshebrada, cubiertas con crema agria, queso fresco, lechuga y salsa verde tatemada.',
    price: 125,
    category: 'Comidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-08', quantityRequired: 0.15 },
      { ingredientId: 'ing-01', quantityRequired: 0.12 },
      { ingredientId: 'ing-05', quantityRequired: 0.03 }
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
      { ingredientId: 'ing-14', quantityRequired: 0.10 },
      { ingredientId: 'ing-15', quantityRequired: 0.05 },
      { ingredientId: 'ing-13', quantityRequired: 0.06 }
    ]
  },

  // --- CENAS & TACOS ---
  {
    id: 'prod-cen-01',
    name: 'Enchiladas Suizas de Pollo (3 pzs)',
    description: 'Tres tortillas de maíz rellenas de pollo gratinadas con abundante queso manchego y salsa verde suave cremosa.',
    price: 145,
    category: 'Cenas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-08', quantityRequired: 0.12 },
      { ingredientId: 'ing-01', quantityRequired: 0.12 },
      { ingredientId: 'ing-06', quantityRequired: 0.06 }
    ]
  },
  {
    id: 'prod-cen-02',
    name: 'Tacos al Pastor con Queso Derretido',
    description: 'Carne de cerdo marinada al pastor con piña asada, cebolla, cilantro y queso gratinado sobre tortilla doble.',
    price: 135,
    category: 'Cenas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-03', quantityRequired: 0.18 },
      { ingredientId: 'ing-08', quantityRequired: 0.15 },
      { ingredientId: 'ing-05', quantityRequired: 0.04 }
    ]
  },

  // --- BEBIDAS NATURALES & SALUDABLES ---
  {
    id: 'prod-beb-01',
    name: 'Agua Fresca de Horchata Artesanal (600ml)',
    description: 'Elaborada diariamente con arroz seleccionado, canela entera, leche y toque de vainilla.',
    price: 45,
    category: 'Bebidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-23', quantityRequired: 0.20 },
      { ingredientId: 'ing-27', quantityRequired: 1 }
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
    imageUrl: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-22', quantityRequired: 0.20 },
      { ingredientId: 'ing-27', quantityRequired: 1 }
    ]
  },
  {
    id: 'prod-beb-03',
    name: 'Jugo Verde Detox Natural (500ml)',
    description: 'Extracción fresca de nopal, piña miel, apio, espinaca y jugo de limón agrio.',
    price: 55,
    category: 'Bebidas',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-16', quantityRequired: 0.05 },
      { ingredientId: 'ing-17', quantityRequired: 0.10 },
      { ingredientId: 'ing-18', quantityRequired: 0.05 },
      { ingredientId: 'ing-27', quantityRequired: 1 }
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
      { ingredientId: 'ing-24', quantityRequired: 0.02 }
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
      { ingredientId: 'ing-25', quantityRequired: 0.005 },
      { ingredientId: 'ing-21', quantityRequired: 0.25 }
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
      { ingredientId: 'ing-10', quantityRequired: 0.15 },
      { ingredientId: 'ing-01', quantityRequired: 0.10 },
      { ingredientId: 'ing-24', quantityRequired: 0.02 },
      { ingredientId: 'ing-26', quantityRequired: 1 },
      { ingredientId: 'ing-27', quantityRequired: 1 }
    ]
  },
  {
    id: 'prod-cmb-02',
    name: 'Combo Comida Chilanga To-Go',
    description: 'Incluye Torta de Milanesa Especial + Agua Fresca de Horchata/Jamaica 600ml + Flan Nápolitano + Empaque.',
    price: 160,
    category: 'Combos',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-09', quantityRequired: 1 },
      { ingredientId: 'ing-02', quantityRequired: 0.15 },
      { ingredientId: 'ing-23', quantityRequired: 0.20 },
      { ingredientId: 'ing-26', quantityRequired: 1 },
      { ingredientId: 'ing-27', quantityRequired: 1 }
    ]
  },
  {
    id: 'prod-cmb-03',
    name: 'Combo Taco Pack Express (Para llevar)',
    description: 'Incluye Orden de 4 Tacos de Guisado + Frijoles Charros + Agua Fresca Natural 600ml + Empaque To-Go.',
    price: 155,
    category: 'Combos',
    active: true,
    hasInventory: true,
    imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&auto=format&fit=crop',
    recipeIngredients: [
      { ingredientId: 'ing-08', quantityRequired: 0.20 },
      { ingredientId: 'ing-01', quantityRequired: 0.15 },
      { ingredientId: 'ing-11', quantityRequired: 0.10 },
      { ingredientId: 'ing-26', quantityRequired: 1 },
      { ingredientId: 'ing-27', quantityRequired: 1 }
    ]
  },

  // --- POSTRES ---
  {
    id: 'prod-pos-01',
    name: 'Flan Nápolitano Cremoso',
    description: 'Flan casero suave de vainilla horneado con caramelo líquido.',
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
      { ingredientId: 'ing-19', quantityRequired: 0.05 }
    ]
  }
]

class DemoSeedService {
  /**
   * Clears old data & Resets the entire Database to the clean F&B Mexican Demo Dataset
   */
  async resetAndSeedFnBDemoData(): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('demo-seed', '🌱 Iniciando reinicio de base de datos para Demo F&B México...')

      // Guardar localmente los productos e insumos para disponibilidad inmediata en UI y offline
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('reisbloc_demo_ingredients', JSON.stringify(DEMO_INGREDIENTS))
        localStorage.setItem('reisbloc_demo_products', JSON.stringify(DEMO_PRODUCTS))
        localStorage.setItem('reisbloc_demo_users', JSON.stringify([DEMO_ADMIN_USER]))
      }

      // Intentar limpiar y re-poblar Supabase si hay conexión
      try {
        const { error: errUser } = await supabase.from('users').upsert([{
          id: DEMO_ADMIN_USER.id,
          username: DEMO_ADMIN_USER.username,
          pin: DEMO_ADMIN_USER.pin,
          role: DEMO_ADMIN_USER.role,
          email: DEMO_ADMIN_USER.email,
          active: true
        }], { onConflict: 'username' })

        if (errUser) {
          logger.warn('demo-seed', 'Aviso al upsert de admin en Supabase', errUser)
        }

        // Upsert productos en Supabase
        const dbProducts = DEMO_PRODUCTS.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          available: p.active,
          has_inventory: p.hasInventory
        }))

        const { error: errProd } = await supabase.from('products').upsert(dbProducts, { onConflict: 'id' })
        if (errProd) {
          logger.warn('demo-seed', 'Aviso al upsert de productos en Supabase', errProd)
        }
      } catch (errDb) {
        logger.warn('demo-seed', 'Modo offline / Supabase sin tablas remotas directas. Datos locales de demostración listos.', errDb)
      }

      logger.info('demo-seed', '✅ Reinicio completado exitosamente.')
      return {
        success: true,
        message: 'Base de datos reiniciada con éxito: 1 Usuario Admin, Insumos por Receta, Menú de Desayunos, Comidas, Cenas, Bebidas Saludables y Combos para llevar México.'
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
