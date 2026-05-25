const KEY = "guest_session_v1";
const MAX_DAYS = 7;
const HYDRATED_KEY = "guest_session_hydrated_v1";

export function loadGuestSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(HYDRATED_KEY, "true");
      return null;
    }

    const session = JSON.parse(raw);

    const age =
      (Date.now() - new Date(session.updatedAt).getTime()) /
      (1000 * 60 * 60 * 24);

    if (age > MAX_DAYS) {
      localStorage.removeItem(KEY);
      localStorage.setItem(HYDRATED_KEY, "true");
      return null;
    }

    // 🔑 MARCAMOS QUE YA SE HIDRATÓ
    localStorage.setItem(HYDRATED_KEY, "true");

    const expiresInDays = Math.max(
      0,
      MAX_DAYS - Math.floor(age)
    );

    return {session, expiresInDays};
  } catch {
    localStorage.setItem(HYDRATED_KEY, "true");
    return null;
  }
}

export function saveGuestSession(payload) {
  try {
    // 🔒 BLOQUEO: si no se ha hidratado, NO escribimos
    if (localStorage.getItem(HYDRATED_KEY) !== "true") {
      return;
    }

    const prevRaw = localStorage.getItem(KEY);
    const prev = prevRaw ? JSON.parse(prevRaw) : {};

    const next = {
      ...prev,
      ...payload,
      version: 1,
      guestId: prev.guestId || crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // silencioso
  }
}

export function clearGuestSession() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(HYDRATED_KEY);
}
