import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import { env } from "../src/config/env.js";
import { Order } from "../src/models/Order.js";
import { OrderSequence } from "../src/models/OrderSequence.js";
import { EmailNotification } from "../src/models/EmailNotification.js";
import { Customization } from "../src/models/Customization.js";
import { Product } from "../src/models/Product.js";
import { storageProvider } from "../src/storage/index.js";

const CONFIRMATION = "--confirm=RESET_PRELAUNCH";

export function executionRequested(args, actualDatabase = null) {
  const databaseFlags = args.filter((arg) => arg.startsWith("--database="));
  if (args.some((arg) => arg !== "--execute" && arg !== CONFIRMATION && !/^--database=[A-Za-z0-9_-]+$/.test(arg))) {
    throw new Error("Argumento desconocido; no se modificó ningún dato.");
  }
  const execute = args.includes("--execute");
  const confirm = args.includes(CONFIRMATION);
  if (execute !== confirm) throw new Error("Para ejecutar se requieren --execute y --confirm=RESET_PRELAUNCH juntos.");
  if (execute && (databaseFlags.length !== 1 || !databaseFlags[0].slice("--database=".length))) {
    throw new Error("Para ejecutar confirma también --database=<nombre mostrado en dry-run>.");
  }
  if (!execute && databaseFlags.length) throw new Error("--database solo se admite al ejecutar.");
  if (execute && actualDatabase && databaseFlags[0] !== `--database=${actualDatabase}`) {
    throw new Error("La base confirmada no coincide con la conexión actual; no se modificó ningún dato.");
  }
  return execute && confirm;
}

export function orderOwnedKeys(customization) {
  const id = String(customization._id);
  const prefix = `customizations/${id}/`;
  const keys = [
    customization.productionBundle?.zipStorageKey,
    customization.productionBundle?.manifestStorageKey,
    ...(customization.productionSurfaces || []).flatMap((surface) => [
      surface.artwork?.storageKey, surface.preview?.storageKey,
      surface.placementProof?.storageKey, surface.placementMetadata?.storageKey,
    ]),
    ...Object.values(customization.designDocument?.assets || {}).map((asset) => asset?.storageKey),
    customization.schemaVersion === 2 ? null : `customizations/${id}.zip`,
  ].filter(Boolean);
  return {
    exclusive: [...new Set(keys.filter((key) => key.startsWith(prefix) || key === `customizations/${id}.zip`))],
    ambiguous: [...new Set(keys.filter((key) => !key.startsWith(prefix) && key !== `customizations/${id}.zip`))],
  };
}

export function stockCandidates(orders) {
  const totals = new Map();
  for (const order of orders) {
    for (const item of order.items || []) {
      if (!item.productId || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) continue;
      const key = String(item.productId);
      totals.set(key, (totals.get(key) || 0) + item.quantity);
    }
  }
  return [...totals].map(([productId, possibleQuantity]) => ({ productId, possibleQuantity }));
}

export function nextOrderNumberAfterReset(date = new Date()) {
  return `MLG-${date.toISOString().slice(2, 10).replaceAll("-", "")}-001`;
}

export async function auditPrelaunchOrders(models = { Order, EmailNotification, Customization, OrderSequence, Product }, storage = storageProvider) {
  const orders = await models.Order.find().select("_id orderNumber createdAt items.productId items.quantity items.customizationId").lean();
  const orderIds = orders.map((order) => order._id);
  const notifications = await models.EmailNotification.find({ orderId: { $in: orderIds } }).select("_id orderId event").lean();
  const orphanNotifications = await models.EmailNotification.find({ orderId: { $nin: orderIds } }).select("_id orderId event").lean();
  // Solo documentos ligados a un pedido; los drafts sin orderId se conservan salvo referencia explícita desde Order.items.
  const itemCustomizationIds = orders.flatMap((order) => order.items || []).map((item) => item.customizationId).filter(Boolean);
  const customizations = await models.Customization.find({
    $or: [{ orderId: { $in: orderIds } }, { _id: { $in: itemCustomizationIds } }],
  }).lean();
  const orphanCustomizations = await models.Customization.find({ orderId: { $ne: null, $nin: orderIds } })
    .select("_id orderId").lean();
  const sequences = await models.OrderSequence.find().select("dateKey seq").lean();
  const candidates = stockCandidates(orders);
  const products = candidates.length
    ? await models.Product.find({ _id: { $in: candidates.map((entry) => entry.productId) } }).select("_id name stock").lean()
    : [];
  const productById = new Map(products.map((product) => [String(product._id), product]));
  const stock = candidates.map((entry) => ({ ...entry, name: productById.get(entry.productId)?.name || "Producto ausente", currentStock: productById.get(entry.productId)?.stock ?? null, verifiedReversal: null }));
  const ownedKeys = customizations.map(orderOwnedKeys);
  const otherCustomizations = await models.Customization.find({ _id: { $nin: customizations.map((entry) => entry._id) } })
    .select("productionBundle productionSurfaces designDocument").lean();
  const productImages = await models.Product.find().select("image images").lean();
  const otherReferences = JSON.stringify({ otherCustomizations, productImages });
  const ownedExclusive = [...new Set(ownedKeys.flatMap((entry) => entry.exclusive))];
  const exclusiveKeys = ownedExclusive.filter((key) => !otherReferences.includes(key));
  const ambiguousKeys = [...new Set([...ownedKeys.flatMap((entry) => entry.ambiguous), ...ownedExclusive.filter((key) => otherReferences.includes(key))])];
  const files = [];
  for (const key of exclusiveKeys) if (await storage.exists(key)) files.push(key);
  return { orders, notifications, orphanNotifications, customizations, orphanCustomizations, sequences, stock, exclusiveKeys, ambiguousKeys, files };
}

function printAudit(audit, database, host, execute) {
  console.log(execute ? "PRE-LAUNCH ORDER RESET — EXECUTION PLAN" : "PRE-LAUNCH ORDER RESET — DRY RUN");
  console.log("THIS COMMAND IS ONLY FOR PRE-LAUNCH TEST DATA.");
  console.log(`Database: ${database}`);
  console.log(`Mongo host: ${host}`);
  console.log(`Orders: ${audit.orders.length}`);
  console.log(`Latest orderNumber: ${audit.orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.orderNumber || "—"}`);
  console.log(`EmailNotifications: ${audit.notifications.length}`);
  console.log(`Orphan EmailNotifications retained: ${audit.orphanNotifications.length}`);
  console.log(`Customizations: ${audit.customizations.length}`);
  console.log(`Orphan Customizations retained: ${audit.orphanCustomizations.length}`);
  console.log(`Artifacts: ${audit.exclusiveKeys.length} exclusive keys`);
  console.log(`Existing files: ${audit.files.length}`);
  console.log(`Ambiguous/shared asset keys retained: ${audit.ambiguousKeys.length}`);
  console.log("Orders found:", audit.orders.map((order) => ({ id: String(order._id), orderNumber: order.orderNumber || null })));
  console.log("EmailNotifications found:", audit.notifications.map((entry) => ({ id: String(entry._id), orderId: String(entry.orderId), event: entry.event })));
  console.log("Customization records found:", audit.customizations.map((entry) => ({ id: String(entry._id), orderId: entry.orderId ? String(entry.orderId) : null, productionStatus: entry.productionStatus || null })));
  console.log("Orphan customization references retained:", audit.orphanCustomizations.map((entry) => ({ id: String(entry._id), orderId: String(entry.orderId) })));
  console.log("Exclusive files found:", audit.files);
  console.log("Ambiguous asset keys retained:", audit.ambiguousKeys);
  console.log("Stock: unchanged");
  console.log("Stock no reconciliado: se conserva tal como está. El catálogo actual se considera de prueba.");
  console.log("Stock candidates (informational only):", audit.stock);
  console.log("OrderSequence: reset on execute; current:", audit.sequences.map((entry) => ({ dateKey: entry.dateKey, seq: entry.seq })));
  console.log(`Next orderNumber after reset (simulation only): ${nextOrderNumberAfterReset()}`);
  console.log("NO DATA HAS BEEN DELETED YET.");
  console.log(`To execute after confirming target: node scripts/reset-prelaunch-orders.js --execute --confirm=RESET_PRELAUNCH --database=${database}`);
}

export async function deleteOrderData(audit, models = { Order, EmailNotification, Customization, OrderSequence }, session = null) {
  const options = session ? { session } : {};
  if (await models.Order.countDocuments({}, options) !== audit.orders.length) throw new Error("Orders cambiaron durante la auditoría.");
  const orderIds = audit.orders.map((entry) => entry._id);
  await models.EmailNotification.deleteMany({ orderId: { $in: orderIds } }, options);
  await models.Customization.deleteMany({ _id: { $in: audit.customizations.map((entry) => entry._id) } }, options);
  await models.Order.deleteMany({}, options);
  await models.OrderSequence.deleteMany({}, options);
}

export async function runPrelaunchReset(args = process.argv.slice(2)) {
  const execute = executionRequested(args);
  if (!env.MONGO_URI) throw new Error("MONGO_URI no configurada.");
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000, autoIndex: false, autoCreate: false });
  try {
    const audit = await auditPrelaunchOrders();
    const host = mongoose.connection.host || "no disponible";
    const database = mongoose.connection.db.databaseName;
    printAudit(audit, database, host, execute);
    if (!execute) return audit;
    executionRequested(args, database);
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(() => deleteOrderData(audit, { Order, EmailNotification, Customization, OrderSequence }, session));
    } finally { await session.endSession(); }
    console.log("MongoDB transaction committed. File cleanup starts now.");
    // Archivos exactos y exclusivos, después del commit; nunca borrar drafts ni uploads originales.
    for (const key of audit.files) await storageProvider.delete(key);
    const [ordersLeft, emailsLeft, linkedCustomizationsLeft, sequencesLeft] = await Promise.all([
      Order.countDocuments(), EmailNotification.countDocuments({ orderId: { $in: audit.orders.map((entry) => entry._id) } }),
      Customization.countDocuments({ _id: { $in: audit.customizations.map((entry) => entry._id) } }), OrderSequence.countDocuments(),
    ]);
    if (ordersLeft || emailsLeft || linkedCustomizationsLeft || sequencesLeft) throw new Error("Verificación post-cleanup fallida.");
    console.log("RESET COMPLETADO; Orders, EmailNotifications, Customizations ligadas y OrderSequence = 0.");
    return audit;
  } finally { await mongoose.disconnect(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runPrelaunchReset().catch((error) => {
    // No incluir mensajes de driver que podrían contener URI/credenciales.
    const safeMessage = /^(Argumento desconocido|Para ejecutar|--database|La base confirmada|Orders cambiaron|Verificación post-cleanup fallida)/.test(error.message)
      ? error.message : "Revisa conexión, transacción o archivos; consulta el estado de MongoDB antes de reintentar.";
    console.error(`Reset no completado: ${safeMessage}`);
    process.exitCode = 1;
  });
}
