import React, { useEffect, useMemo, useState } from "react";
<div className="font-medium mb-1">Tryb gościa (LocalStorage)</div>
<ul className="list-disc ml-5">
<li>Ulubione i Playlisty zapisywane lokalnie w przeglądarce</li>
<li>Brak konta/logowania</li>
</ul>
</div>
</div>
)}
</div>
</div>


<div className="p-4 border-t flex justify-end">
<button className="px-4 py-2 rounded-xl bg-black text-white" onClick={() => setShowSettings(false)}>Zapisz</button>
</div>
</div>
</div>
)}
</div>
);
}


function AuthPanel({ supabase, authView, setAuthView }) {
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState("");


async function submit() {
setLoading(true);
setMessage("");
try {
if (authView === "signup") {
const { error } = await supabase.auth.signUp({ email, password });
if (error) throw error;
setMessage("Konto utworzone. Zaloguj się.");
setAuthView("signin");
} else {
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;
}
} catch (e) {
setMessage(e.message || "Błąd logowania/rejestracji.");
} finally {
setLoading(false);
}
}


return (
<div className="rounded-xl border p-3">
<div className="flex items-center gap-2 mb-2">
<button
className={`px-3 py-1 rounded-lg border ${authView === "signin" ? "bg-black text-white" : ""}`}
onClick={() => setAuthView("signin")}
>Logowanie</button>
<button
className={`px-3 py-1 rounded-lg border ${authView === "signup" ? "bg-black text-white" : ""}`}
onClick={() => setAuthView("signup")}
>Rejestracja</button>
</div>
<label className="text-sm text-black/60">Email</label>
<input className="mt-1 w-full px-3 py-2 rounded-xl border" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
<label className="text-sm text-black/60 mt-2 block">Hasło</label>
<input className="mt-1 w-full px-3 py-2 rounded-xl border" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
{message ? <div className="mt-2 text-sm text-black/70">{message}</div> : null}
<button disabled={loading} onClick={submit} className="mt-3 w-full px-3 py-2 rounded-xl bg-black text-white disabled:opacity-60">{authView === "signup" ? "Utwórz konto" : "Zaloguj"}</button>
</div>
);
}
