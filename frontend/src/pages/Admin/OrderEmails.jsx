import { useEffect, useState } from "react";
import { adminGetOrderEmails, adminRetryOrderEmail } from "../../services/orders.service";
import { Button } from "../../components/ui/button";
import { getOrderEmailRows } from "./orderEmailRows.js";

export function OrderEmails({ orderId, order }) {
  const [emails, setEmails] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let active = true;
    adminGetOrderEmails(orderId)
      .then((data) => { if (active) setEmails(data.emails || []); })
      .catch(() => { if (active) setError("No se pudo cargar el registro de emails."); });
    return () => { active = false; };
  }, [orderId, order.status, order.payment?.status]);

  const retry = async (event) => {
    setBusy(event);
    setError("");
    try {
      await adminRetryOrderEmail(orderId, event);
      const data = await adminGetOrderEmails(orderId);
      setEmails(data.emails || []);
    } catch { setError("No se pudo reintentar el email."); }
    finally { setBusy(""); }
  };

  return <section className="rounded-xl border p-4" aria-label="Emails transaccionales">
    <h3 className="font-semibold">Emails</h3>
    {error && <p className="mt-2 text-xs text-destructive" role="alert">{error}</p>}
    <ul className="mt-3 space-y-2 text-xs">
      {getOrderEmailRows(order, emails).map(({ event, label, email }) => <li key={event} className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="text-right text-muted-foreground">
          {email?.status === "sent" ? `✓ Enviado · ${new Date(email.sentAt).toLocaleDateString("es-ES")}` : email?.status === "failed" ? "✕ Error" : email?.status === "pending" ? "… En curso" : "— Pendiente"}
          {email?.status === "failed" && <Button type="button" variant="outline" size="sm" className="ml-2" disabled={Boolean(busy)} onClick={() => retry(event)}>Reintentar</Button>}
        </span>
      </li>)}
    </ul>
  </section>;
}
