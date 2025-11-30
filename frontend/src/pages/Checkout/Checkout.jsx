import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { createOrderRequest } from "../../services/orders.service";
import { Button } from "@chakra-ui/react";
import "./Checkout.css";

export function Checkout() {
  const { user } = useAuth();
  const { items, totalAmount, clearCart, updateQuantity, removeItem } = useCart();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!user) {
      nav("/login", { replace: true, state: { from: "/checkout" } });
    }
  }, [user, nav]);

  if (!user) {
    return null; // el redirect de useEffect ya se ocupa
  }

  const handleConfirmOrder = async () => {
    setError("");
    setSuccessMsg("");

    if (!items.length) {
      setError("El carrito está vacío");
      return;
    }

    try {
      setLoading(true);
      const data = await createOrderRequest(items);
      if (!data.ok) {
        setError(data.message || "No se pudo crear el pedido");
        return;
      }

      clearCart();
      setSuccessMsg(`Pedido creado correctamente. Nº: ${data.orderId}`);
      // Opcional: nav("/mis-pedidos");
    } catch (err) {
      setError(err?.message || "Error al crear el pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="checkout-view">
      <div className="card checkout-card">
        <h1>Checkout</h1>
        <p className="muted">Revisa tu pedido antes de confirmar.</p>

        {!items.length && (
          <p>No hay productos en el carrito.</p>
        )}

        {items.length > 0 && (
          <div className="checkout-table-wrap">
            <table className="table table-modern">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num">Precio</th>
                  <th className="num">Cantidad</th>
                  <th className="num">Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.productId}>
                    <td data-label="Producto" className="text-strong">
                      {it.name}
                    </td>
                    <td data-label="Precio" className="num">
                      {it.price.toFixed(2)} €
                    </td>
                    <td data-label="Cantidad" className="num">
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) =>
                          updateQuantity(it.productId, e.target.value)
                        }
                        style={{ width: "60px" }}
                      />
                    </td>
                    <td data-label="Subtotal" className="num">
                      {(it.price * it.quantity).toFixed(2)} €
                    </td>
                    <td className="num">
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => removeItem(it.productId)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={3}>Total</th>
                  <th className="num">{totalAmount.toFixed(2)} €</th>
                  <th></th>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
        {successMsg && (
          <p className="success" style={{ marginTop: 12 }}>{successMsg}</p>
        )}

        <div className="form-actions" style={{ marginTop: 16 }}>
          <Button
            type="button"
            disabled={loading || !items.length}
            onClick={handleConfirmOrder}
          >
            {loading ? "Creando pedido..." : "Confirmar pedido"}
          </Button>
        </div>
      </div>
    </section>
  );
}
