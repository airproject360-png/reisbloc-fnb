import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Select,
  Button,
  Modal,
  Alert,
  Table,
  Badge,
  LoadingSpinner,
} from '@/components/ui';
import { bulkInventoryService, Recipe, Ingredient } from '@/services/bulkInventoryService';

/**
 * RecipeManager Component
 * 
 * Permite a admin/supervisor UPDATE de recetas preexistentes.
 * NO permite INSERT de nuevas recetas (seguridad).
 * 
 * FEATURES:
 * - Listar recetas actuales
 * - Actualizar cantidades de ingredientes
 * - Cambiar merma
 * - Ver estado de stock en tiempo real
 */

export function RecipeManager() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);

  // Formulario
  const [formData, setFormData] = useState<{
    [ingredientId: string]: {
      quantity_required: string;
      waste_margin_percent: string;
    };
  }>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [recipesData, ingredientsData] = await Promise.all([
        bulkInventoryService.getRecipes(),
        bulkInventoryService.getIngredients(),
      ]);
      setRecipes(recipesData);
      setIngredients(ingredientsData);
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error al cargar datos: ${error instanceof Error ? error.message : 'desconocido'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);

    // Preparar formulario con valores actuales
    const initialForm: typeof formData = {};
    recipe.ingredients.forEach((item) => {
      initialForm[item.ingredient_id] = {
        quantity_required: item.quantity_required.toString(),
        waste_margin_percent: item.waste_margin_percent.toString(),
      };
    });
    setFormData(initialForm);
    setShowModal(true);
  };

  const handleSaveRecipe = async () => {
    if (!selectedRecipe) return;

    try {
      // Preparar items para guardar
      const items = selectedRecipe.ingredients.map((item) => ({
        ingredient_id: item.ingredient_id,
        quantity_required: parseFloat(formData[item.ingredient_id]?.quantity_required || item.quantity_required.toString()),
        waste_margin_percent:
          parseFloat(formData[item.ingredient_id]?.waste_margin_percent || item.waste_margin_percent.toString()) || undefined,
      }));

      // Guardar
      await bulkInventoryService.updateRecipeItems(selectedRecipe.id, items);

      setMessage({
        type: 'success',
        text: `✅ Receta "${selectedRecipe.name}" actualizada`,
      });

      setShowModal(false);
      setSelectedRecipe(null);
      await loadData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error al guardar: ${error instanceof Error ? error.message : 'desconocido'}`,
      });
    }
  };

  const getIngredientStock = (ingredientId: string) => {
    const ingredient = ingredients.find((i) => i.id === ingredientId);
    return ingredient
      ? `${ingredient.current_stock}${ingredient.unit_type}`
      : 'N/A';
  };

  const getStockStatus = (ingredientId: string) => {
    const ingredient = ingredients.find((i) => i.id === ingredientId);
    if (!ingredient) return 'unknown';
    if (ingredient.stock_status === 'CRITICAL') return 'danger';
    if (ingredient.stock_status === 'LOW') return 'warning';
    return 'success';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner message="Cargando recetas..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Gestor de Recetas
            </h1>
            <p className="text-gray-600 mt-1">
              Actualiza ingredientes y cantidades de recetas preexistentes
            </p>
          </div>
          <Button variant="secondary" onClick={loadData}>
            🔄 Actualizar
          </Button>
        </div>

        {/* Advertencia importante */}
        <Alert type="info" title="ℹ️ Información importante">
          Solo puedes actualizar recetas existentes. Para crear nuevas recetas,
          contacta al administrador. Los cambios no afectan órdenes anteriores.
        </Alert>

        {/* Mensaje de estado */}
        {message && (
          <Alert
            type={message.type}
            onDismiss={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        {/* Listado de recetas */}
        <Card title="Recetas Disponibles">
          <Table
            columns={[
              {
                key: 'name',
                label: 'Nombre',
                width: '300px',
              },
              {
                key: 'description',
                label: 'Descripción',
              },
              {
                key: 'is_active',
                label: 'Estado',
                render: (value) => (
                  <Badge variant={value ? 'success' : 'warning'}>
                    {value ? 'Activa' : 'Inactiva'}
                  </Badge>
                ),
              },
              {
                key: 'version',
                label: 'Versión',
              },
              {
                key: 'id',
                label: 'Acciones',
                render: (id) => (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const recipe = recipes.find((r) => r.id === id);
                      if (recipe) handleSelectRecipe(recipe);
                    }}
                  >
                    Editar
                  </Button>
                ),
              },
            ]}
            data={recipes}
            emptyMessage="No hay recetas disponibles"
          />
        </Card>

        {/* Modal de edición */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={`Editar Receta: ${selectedRecipe?.name}`}
          size="lg"
          footer={
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSaveRecipe}>
                Guardar Cambios
              </Button>
            </div>
          }
        >
          {selectedRecipe && (
            <div className="space-y-6">
              {/* Descripción */}
              {selectedRecipe.description && (
                <Card className="bg-blue-50">
                  <p className="text-sm text-gray-600">
                    <strong>Descripción:</strong> {selectedRecipe.description}
                  </p>
                </Card>
              )}

              {/* Ingredientes */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Ingredientes</h3>
                <div className="space-y-4">
                  {selectedRecipe.ingredients.map((item) => {
                    const currentForm = formData[item.ingredient_id] || {};
                    const stockStatus = getStockStatus(item.ingredient_id);

                    return (
                      <Card
                        key={item.ingredient_id}
                        bordered={true}
                        className="p-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Nombre e info */}
                          <div>
                            <p className="font-semibold">
                              {item.ingredient_name}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Unidad: {item.unit_type}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant={stockStatus}>
                                Stock: {getIngredientStock(item.ingredient_id)}
                              </Badge>
                            </div>
                          </div>

                          {/* Inputs */}
                          <div className="space-y-3">
                            {/* Cantidad requerida */}
                            <Input
                              label="Cantidad Requerida"
                              type="number"
                              step="0.001"
                              min="0"
                              placeholder="0.200"
                              value={
                                currentForm.quantity_required ||
                                item.quantity_required.toString()
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  [item.ingredient_id]: {
                                    ...currentForm,
                                    quantity_required: e.target.value,
                                  },
                                })
                              }
                            />

                            {/* Merma */}
                            <Input
                              label="Merma %"
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              placeholder="15"
                              value={
                                currentForm.waste_margin_percent ||
                                item.waste_margin_percent.toString()
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  [item.ingredient_id]: {
                                    ...currentForm,
                                    waste_margin_percent: e.target.value,
                                  },
                                })
                              }
                            />

                            {/* Preview cálculo */}
                            <div className="p-2 bg-gray-100 rounded text-sm">
                              <p className="text-gray-600">
                                Consumo real (con merma):
                              </p>
                              <p className="font-semibold text-gray-900">
                                {(
                                  parseFloat(
                                    currentForm.quantity_required ||
                                      item.quantity_required.toString()
                                  ) *
                                  (1 +
                                    (parseFloat(
                                      currentForm.waste_margin_percent ||
                                        item.waste_margin_percent.toString()
                                    ) || 0) /
                                      100)
                                ).toFixed(3)}{' '}
                                {item.unit_type}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Resumen */}
              <Alert type="warning">
                ⚠️ Estos cambios afectarán a futuras ventas. Las órdenes
                existentes mantendrán los valores originales.
              </Alert>
            </div>
          )}
        </Modal>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="text-center">
              <p className="text-gray-600 mb-2">Recetas Totales</p>
              <p className="text-4xl font-bold text-blue-600">
                {recipes.length}
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-gray-600 mb-2">Recetas Activas</p>
              <p className="text-4xl font-bold text-green-600">
                {recipes.filter((r) => r.is_active).length}
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-gray-600 mb-2">Ingredientes</p>
              <p className="text-4xl font-bold text-orange-600">
                {ingredients.length}
              </p>
            </div>
          </Card>
        </div>

        {/* Info footer */}
        <Card className="bg-gray-100">
          <p className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> Actualiza merga si notas desperdicio. Por
            ejemplo, si la lechuga tiene mucho escurrido, aumenta la merma a
            20%. Los cambios se reflejan inmediatamente.
          </p>
        </Card>
      </div>
    </div>
  );
}

export default RecipeManager;
