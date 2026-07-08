// Engine (data + checks) for ch.31 — the `tls-replay` figure. It replays the
// TLS 1.3 handshake from ch.28 (§ The Web) and labels which crypto primitive
// each step relies on — the chapter's payoff: TLS is not one trick but every
// primitive in this chapter, assembled. TLS 1.3 (RFC 8446, 2018) cut the
// handshake to one round trip and made forward secrecy mandatory (ephemeral
// key agreement only — static-RSA key transport was removed).
//
// Deterministic. Erasable-syntax only.

export type Primitive = "key-agreement" | "authentication" | "key-derivation" | "aead" | "integrity";

export const PRIMITIVE_LABEL: Record<Primitive, string> = {
  "key-agreement": "Key agreement (ECDHE)",
  authentication: "Authentication (signature)",
  "key-derivation": "Key derivation (HKDF)",
  aead: "Symmetric AEAD (AES-GCM / ChaCha20-Poly1305)",
  integrity: "Integrity (HMAC / AEAD tag)",
};

export type TlsStep = {
  n: number;
  actor: "client" | "server" | "both";
  name: string;
  detail: string;
  primitive: Primitive;
  ties: string; // which ch.31 idea it exercises
};

/** The TLS 1.3 one-RTT handshake, step by step, primitive by primitive. */
export const TLS_STEPS: readonly TlsStep[] = [
  { n: 1, actor: "client", name: "ClientHello + key_share", detail: "Client offers cipher suites and its ephemeral Diffie–Hellman public value (an ECDHE point).", primitive: "key-agreement", ties: "Diffie–Hellman: the public value travels in the clear." },
  { n: 2, actor: "server", name: "ServerHello + key_share", detail: "Server picks a suite and sends its own ephemeral public value; both sides now derive the same DH shared secret.", primitive: "key-agreement", ties: "DH shared secret = the color both mixed, never sent." },
  { n: 3, actor: "server", name: "Certificate", detail: "Server presents its certificate chain — its public key, signed by a CA.", primitive: "authentication", ties: "Public-key identity; the CA's signature vouches for the key." },
  { n: 4, actor: "server", name: "CertificateVerify", detail: "Server signs the transcript with its private key, proving it owns the certificate (not just replaying one).", primitive: "authentication", ties: "RSA/ECDSA signature: sign with private, verify with public." },
  { n: 5, actor: "both", name: "Key schedule (HKDF)", detail: "Both sides feed the DH secret through HKDF to derive the traffic keys — a hash-based KDF.", primitive: "key-derivation", ties: "Hashing: HKDF is built from HMAC-SHA-256." },
  { n: 6, actor: "both", name: "Finished", detail: "Each side sends an HMAC over the handshake transcript, proving nothing was tampered with in flight.", primitive: "integrity", ties: "Keyed hash detects any modification of the handshake." },
  { n: 7, actor: "both", name: "Application data", detail: "Records are encrypted and authenticated with an AEAD cipher using the derived keys.", primitive: "aead", ties: "Symmetric AES: fast bulk encryption once keys are agreed." },
];

/** Which primitives the handshake exercises (all five, by design). */
export function primitivesUsed(): Primitive[] {
  const seen = new Set<Primitive>();
  for (const s of TLS_STEPS) seen.add(s.primitive);
  return [...seen];
}
