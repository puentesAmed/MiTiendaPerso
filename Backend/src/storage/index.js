import { env } from "../config/env.js";
import { LocalStorageProvider } from "./local-storage.provider.js";

export const storageProvider = new LocalStorageProvider(env.STORAGE_ROOT);
