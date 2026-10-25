<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustProxies;

/**
 * Trusts the reverse proxy / load balancer named in TRUSTED_PROXIES (config app.trusted_proxies), so the
 * visitor's real IP from X-Forwarded-For is used for rate limits and logs. With no setting nothing is
 * trusted, and a forwarded header sent by anyone else is ignored.
 */
class TrustConfiguredProxies extends TrustProxies
{
    /**
     * @return array<int, string>|string|null
     */
    protected function proxies(): array|string|null
    {
        $configured = trim((string) config('app.trusted_proxies'));

        if ($configured === '') {
            return null;
        }

        // "*" trusts whichever proxy sent the request (only when the app is reachable through the proxy alone)
        return $configured === '*'
            ? '*'
            : array_values(array_filter(array_map('trim', explode(',', $configured))));
    }
}
