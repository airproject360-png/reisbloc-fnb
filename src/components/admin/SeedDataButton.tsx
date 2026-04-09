import React, { useState } from 'react';
import {
  Button,
  Modal,
  Alert,
  LoadingSpinner,
  Card,
  Badge,
} from '@/components/ui';

/**
 * SeedDataButton Component
 * 
 * Botón para cargar datos de demostración en la base de datos.
 * Llama la función Edge Function `seed-data` con JWT token.
 * 
 * USAGE:
 * <SeedDataButton token={jwtToken} onSuccess={() => loadRecipes()} />
 */

interface SeedDataButtonProps {
  token?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const SeedDataButton = React.forwardRef<HTMLButtonElement, SeedDataButtonProps>(
  ({ token, onSuccess, onError }, ref) => {
    const [showModal, setShowModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{
      type: 'success' | 'error' | 'warning' | 'info';
      text: string;
    } | null>(null);

    const handleSeedData = async () => {
      if (!token) {
        setMessage({
          type: 'error',
          text: 'Token de autenticación requerido. Por favor inicia sesión.',
        });
        onError?.('No token provided');
        return;
      }

      setIsLoading(true);
      setMessage(null);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-data`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: 'seed-demo-recipes',
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || `Error: ${response.status} ${response.statusText}`
          );
        }

        setMessage({
          type: 'success',
          text: `✅ Datos cargados exitosamente:\n${data.message}`,
        });

        // Esperar un momento y luego cerrar
        setTimeout(() => {
          setShowModal(false);
          onSuccess?.();
        }, 2000);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido';

        setMessage({
          type: 'error',
          text: `❌ Error al cargar datos: ${errorMessage}`,
        });

        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <>
        <Button
          ref={ref}
          variant="success"
          onClick={() => {
            setShowModal(true);
            setMessage(null);
          }}
        >
          Cargar Datos Demo
        </Button>

        <Modal
          isOpen={showModal}
          onClose={() => !isLoading && setShowModal(false)}
          title="Cargar Datos de Demostración"
          size="md"
          footer={
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSeedData}
                isLoading={isLoading}
              >
                {isLoading ? 'Cargando...' : 'Cargar Datos'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Advertencia */}
            <Alert type="warning">
              Esto creará ingredientes y recetas de demostración en tu base de
              datos.
            </Alert>

            {/* Lo que se va a crear */}
            <Card title="Se van a crear:">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Badge variant="info">5</Badge>
                  <span>Categorías de ingredientes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="info">16</Badge>
                  <span>Ingredientes variados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="info">6</Badge>
                  <span>Unidades de medida</span>
                </li>
              </ul>
            </Card>

            {/* Ingredientes a crear */}
            <Card title="Categorías">
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">Proteínas</Badge>
                <Badge variant="success">Lácteos</Badge>
                <Badge variant="success">Verduras</Badge>
                <Badge variant="success">Condimentos</Badge>
                <Badge variant="success">Bebidas</Badge>
              </div>
            </Card>

            {/* Estado */}
            {isLoading && (
              <div className="flex justify-center">
                <LoadingSpinner message="Cargando datos..." />
              </div>
            )}

            {/* Mensajes */}
            {message && (
              <Alert type={message.type} dismissible={false}>
                {message.text}
              </Alert>
            )}

            {/* Info */}
            <Alert type="info">
              Necesitas estar conectado como administrador para ejecutar esta
              acción.
            </Alert>
          </div>
        </Modal>
      </>
    );
  }
);

SeedDataButton.displayName = 'SeedDataButton';

export default SeedDataButton;
