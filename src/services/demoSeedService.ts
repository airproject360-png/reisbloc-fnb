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
  unitType: 'kg' | 'liter' | 'units' | string
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

import { APP_CONFIG } from '@/config/constants'

// 1. USUARIO ADMIN ÚNICO
export const DEMO_ADMIN_USER: User = {
  id: '504f4d91-02ea-4693-bb9a-993614a55f03',
  username: 'admin',
  role: 'admin',
  email: `admin@${APP_CONFIG.CLIENT_SUBDOMAIN}`,
  active: true,
  createdAt: new Date(),
  businessName: `${APP_CONFIG.CLIENT_NAME} - ${APP_CONFIG.CLIENT_TAGLINE}`,
  organizationId: APP_CONFIG.ORGANIZATION_ID
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
  // --- QUESADILLAS MAÍZ ---
  {
    id: 'prod-qm-01',
    name: 'Quesadilla Maíz Sencilla',
    description: 'Quesadilla hecha a mano en tortilla de maíz nixtamalizado rellena de queso Oaxaca / Asadero fundido.',
    price: 35,
    category: 'Quesadillas Maíz',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-qm-02',
    name: 'Quesadilla Maíz con Guisado',
    description: 'Tortilla de maíz nixtamalizado con queso fundido y tu guisado artesanal a elegir de la barra caliente.',
    price: 48,
    category: 'Quesadillas Maíz',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-qm-03',
    name: 'Quesadilla Maíz Extra Guisado',
    description: 'Quesadilla de maíz bien servida con doble porción de guisado artesanal a elegir.',
    price: 62,
    category: 'Quesadillas Maíz',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop',
  },

  // --- QUESADILLAS HARINA ---
  {
    id: 'prod-qh-01',
    name: 'Quesadilla Harina Sencilla',
    description: 'Gran tortilla de harina estilo norteño doradita a la plancha con queso asadero fundido.',
    price: 40,
    category: 'Quesadillas Harina',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-qh-02',
    name: 'Quesadilla Harina con Guisado',
    description: 'Tortilla de harina grande con queso fundido y guisado a elegir de la barra caliente.',
    price: 55,
    category: 'Quesadillas Harina',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-qh-03',
    name: 'Quesadilla Harina Extra Guisado',
    description: 'Tortilla de harina con queso y doble porción de guisado bien servido.',
    price: 70,
    category: 'Quesadillas Harina',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop',
  },

  // --- PLATOS & PLATILLOS ---
  {
    id: 'prod-p-01',
    name: 'Plato (1 guisado, 1 guarnición, 4 tortillas)',
    description: 'Plato completo: 1 guisado abundante a elegir, 1 guarnición (frijoles, arroz o espagueti) y 4 tortillas recién hechas.',
    price: 95,
    category: 'Platos',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-p-02',
    name: 'Platillo (2 guisados, 1 guarnición, 4 tortillas)',
    description: 'Platillo especial: 2 guisados a elegir de la barra, 1 guarnición (frijoles, arroz o espagueti) y 4 tortillas de maíz o harina.',
    price: 125,
    category: 'Platos',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-p-03',
    name: 'Sope Normal con Guisado',
    description: 'Base de maíz frito untado con frijoles, guisado a elegir, crema, queso fresco y lechuga.',
    price: 45,
    category: 'Platos',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-p-04',
    name: 'Sope Extra Guisado',
    description: 'Sope artesanal grueso con frijoles refritos y doble porción de guisado de la casa.',
    price: 60,
    category: 'Platos',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
  },

  // --- ANTOJITOS & ESPECIALIDADES ---
  {
    id: 'prod-esp-01',
    name: 'Gordita con Guisado',
    description: 'Gordita de masa nixtamalizada frita u horneada, abierta y rellena con guisado artesanal.',
    price: 48,
    category: 'Especialidades',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-esp-02',
    name: 'Volcán con Guisado',
    description: 'Tortilla de maíz tostada crujiente con abundante queso fundido y guisado encima.',
    price: 52,
    category: 'Especialidades',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-esp-03',
    name: 'Orden de Frijoles Puercos (Especialidad)',
    description: 'Especialidad de la casa: Frijoles refritos con chorizo, queso asadero, manteca y especias tradicionales, acompañados de totopos.',
    price: 65,
    category: 'Especialidades',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop',
  },

  // --- EXTRAS ---
  {
    id: 'prod-ext-01',
    name: 'Mini Pan Dulce',
    description: 'Pieza de mini pan dulce fresco recién horneado.',
    price: 18,
    category: 'Extras',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-ext-02',
    name: 'Bolillo con Guisado',
    description: 'Bolillo crujiente de agua rellenado con guisado bien servido de la barra caliente.',
    price: 45,
    category: 'Extras',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-ext-03',
    name: 'Coctel de Fruta de Temporada',
    description: 'Vaso de fruta fresca picada de temporada (sandía, melón, papaya, piña) con granisado opcional.',
    price: 40,
    category: 'Extras',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop',
  },

  // --- BEBIDAS EMBOTELLADAS (DESCUENTO 1 A 1 EN INVENTARIO) ---
  {
    id: 'prod-beb-coca',
    name: 'Coca-Cola 600ml',
    description: 'Refresco Coca-Cola Original embotellado frío 600ml.',
    price: 35,
    category: 'Bebidas',
    active: true,
    hasInventory: true,
    currentStock: 48,
    minimumStock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-beb-sprite',
    name: 'Sprite 600ml',
    description: 'Refresco Sprite Lima-Limón embotellado frío 600ml.',
    price: 35,
    category: 'Bebidas',
    active: true,
    hasInventory: true,
    currentStock: 36,
    minimumStock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-beb-fanta',
    name: 'Fanta 600ml',
    description: 'Refresco Fanta Naranja embotellado frío 600ml.',
    price: 35,
    category: 'Bebidas',
    active: true,
    hasInventory: true,
    currentStock: 36,
    minimumStock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-beb-fresca',
    name: 'Fresca 600ml',
    description: 'Refresco Fresca Toronja embotellado frío 600ml.',
    price: 35,
    category: 'Bebidas',
    active: true,
    hasInventory: true,
    currentStock: 24,
    minimumStock: 6,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-beb-mundet',
    name: 'Sidral Mundet 600ml',
    description: 'Refresco Sidral Mundet Manzana embotellado frío 600ml.',
    price: 35,
    category: 'Bebidas',
    active: true,
    hasInventory: true,
    currentStock: 24,
    minimumStock: 6,
    imageUrl: 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-beb-ciel',
    name: 'Agua Natural Ciel 600ml',
    description: 'Botella de agua purificada Ciel 600ml.',
    price: 25,
    category: 'Bebidas',
    active: true,
    hasInventory: true,
    currentStock: 60,
    minimumStock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800&auto=format&fit=crop',
  },

  {
    id: 'prod-beb-04',
    name: 'Café de Olla',
    description: 'Café de olla tradicional infusionado con piloncillo y varas de canela.',
    price: 30,
    category: 'Bebidas',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-beb-05',
    name: 'Nescafé',
    description: 'Taza de café instantáneo caliente servido con leche o agua.',
    price: 28,
    category: 'Bebidas',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop',
  },
  {
    id: 'prod-beb-06',
    name: 'Jugo (Fruta de Temporada)',
    description: 'Jugo 100% natural exprimido al momento (naranja, toronja o verde).',
    price: 38,
    category: 'Bebidas',
    active: true,
    hasInventory: false,
    imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800&auto=format&fit=crop',
  },
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
