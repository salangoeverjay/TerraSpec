<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Allow the request only for a signed-in user whose role is one of the given roles,
 * e.g. ->middleware('role:admin,planner'). Users who must still change their initial
 * password are blocked from everything except changing it.
 */
class EnsureUserHasRole
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->must_change_password) {
            return response()->json(['message' => 'You must change your password before continuing.'], 403);
        }

        if (! in_array($user->role, $roles, true)) {
            return response()->json(['message' => 'You do not have permission to do this.'], 403);
        }

        return $next($request);
    }
}
