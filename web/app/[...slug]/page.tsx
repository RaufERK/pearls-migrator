import { permanentRedirect } from 'next/navigation';

export default function LegacyFallbackPage() {
  permanentRedirect('/');
}
