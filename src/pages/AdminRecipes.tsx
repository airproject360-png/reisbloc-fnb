import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Input,
  Select,
  Table,
  Alert,
  Modal,
  Badge,
  LoadingSpinner,
} from '@/components/ui';

interface Recipe {
  id: number;
  name: string;
  category: string;
  cost: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export function AdminRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    cost: '',
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  // Simular carga de recetas
  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setIsLoading(true);
    try {
      // Simular API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setRecipes([
        {
          id: 1,
          name: 'Hamburguesa Clásica',
          category: 'main',
          cost: 5.99,
          status: 'active',
          createdAt: '2024-01-15',
        },
        {
          id: 2,
          name: 'Papas Fritas',
          category: 'side',
          cost: 2.5,
          status: 'active',
          createdAt: '2024-01-15',
        },
        {
          id: 3,
          name: 'Bebida Fría',
          category: 'beverage',
          cost: 1.99,
          status: 'inactive',
          createdAt: '2024-01-10',
        },
      ]);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error al cargar recetas',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    // Validar
    if (!formData.name.trim()) {
      setMessage({
        type: 'error',
        text: 'El nombre de la receta es requerido',
      });
      return;
    }

    if (!formData.category) {
      setMessage({
        type: 'error',
        text: 'Selecciona una categoría',
      });
      return;
    }

    if (!formData.cost || parseFloat(formData.cost) <= 0) {
      setMessage({
        type: 'error',
        text: 'El costo debe ser mayor a 0',
      });
      return;
    }

    // Crear o editar
    if (editingId) {
      setRecipes(
        recipes.map((r) =>
          r.id === editingId
            ? {
                ...r,
                name: formData.name,
                category: formData.category,
                cost: parseFloat(formData.cost),
              }
            : r
        )
      );
      setMessage({
        type: 'success',
        text: 'Receta actualizada exitosamente',
      });
    } else {
      const newRecipe: Recipe = {
        id: Math.max(...recipes.map((r) => r.id), 0) + 1,
        name: formData.name,
        category: formData.category,
        cost: parseFloat(formData.cost),
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setRecipes([...recipes, newRecipe]);
      setMessage({
        type: 'success',
        text: 'Receta creada exitosamente',
      });
    }

    // Limpiar
    setFormData({ name: '', category: '', cost: '' });
    setEditingId(null);
    setShowModal(false);
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setFormData({
      name: recipe.name,
      category: recipe.category,
      cost: recipe.cost.toString(),
    });
    setShowModal(true);
  };

  const handleToggleStatus = (id: number) => {
    setRecipes(
      recipes.map((r) =>
        r.id === id
          ? {
              ...r,
              status: r.status === 'active' ? 'inactive' : 'active',
            }
          : r
      )
    );
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', category: '', cost: '' });
    setShowModal(true);
  };

  const categoryOptions = [
    { value: 'main', label: 'Plato Principal' },
    { value: 'side', label: 'Acompañamiento' },
    { value: 'beverage', label: 'Bebida' },
    { value: 'dessert', label: 'Postre' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-900">
            Gestión de Recetas
          </h1>
          <Button onClick={openCreate} variant="primary" size="lg">
            + Nueva Receta
          </Button>
        </div>

        {/* Messages */}
        {message && (
          <Alert
            type={message.type}
            onDismiss={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        {/* Main Card */}
        <Card title="Recetas disponibles">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner message="Cargando recetas..." />
            </div>
          ) : (
            <Table
              columns={[
                {
                  key: 'name',
                  label: 'Nombre',
                  width: '300px',
                },
                {
                  key: 'category',
                  label: 'Categoría',
                  render: (value) => {
                    const categoryMap: Record<string, string> = {
                      main: 'Principal',
                      side: 'Acompañamiento',
                      beverage: 'Bebida',
                      dessert: 'Postre',
                    };
                    return categoryMap[value] || value;
                  },
                },
                {
                  key: 'cost',
                  label: 'Costo',
                  render: (value) => `$${value.toFixed(2)}`,
                },
                {
                  key: 'status',
                  label: 'Estado',
                  render: (value) => (
                    <Badge
                      variant={
                        value === 'active' ? 'success' : 'warning'
                      }
                    >
                      {value === 'active' ? 'Activa' : 'Inactiva'}
                    </Badge>
                  ),
                },
                {
                  key: 'createdAt',
                  label: 'Creada',
                },
                {
                  key: 'id',
                  label: 'Acciones',
                  render: (value) => {
                    const recipe = recipes.find((r) => r.id === value);
                    return (
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(recipe!)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant={
                            recipe?.status === 'active'
                              ? 'warning'
                              : 'success'
                          }
                          size="sm"
                          onClick={() =>
                            handleToggleStatus(value)
                          }
                        >
                          {recipe?.status === 'active'
                            ? 'Desactivar'
                            : 'Activar'}
                        </Button>
                      </div>
                    );
                  },
                },
              ]}
              data={recipes}
              emptyMessage="No hay recetas creadas. ¡Crea una para comenzar!"
            />
          )}
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="text-center">
              <p className="text-gray-600 mb-2">Total de Recetas</p>
              <p className="text-4xl font-bold text-blue-600">
                {recipes.length}
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-gray-600 mb-2">Recetas Activas</p>
              <p className="text-4xl font-bold text-green-600">
                {recipes.filter((r) => r.status === 'active').length}
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <p className="text-gray-600 mb-2">Costo Promedio</p>
              <p className="text-4xl font-bold text-orange-600">
                $
                {recipes.length > 0
                  ? (
                      recipes.reduce((sum, r) => sum + r.cost, 0) /
                      recipes.length
                    ).toFixed(2)
                  : '0.00'}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Editar Receta' : 'Nueva Receta'}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              {editingId ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre de la Receta"
            placeholder="Ejemplo: Hamburguesa Clásica"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
          />

          <Select
            label="Categoría"
            placeholder="Seleccionar categoría..."
            options={categoryOptions}
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
          />

          <Input
            label="Costo de Producción"
            placeholder="5.99"
            type="number"
            step="0.01"
            min="0"
            value={formData.cost}
            onChange={(e) =>
              setFormData({ ...formData, cost: e.target.value })
            }
          />
        </div>
      </Modal>
    </div>
  );
}

export default AdminRecipes;
