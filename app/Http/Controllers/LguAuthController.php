<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class LguAuthController extends Controller
{
    // POST /api/lgu/login (throttled: 5 attempts per minute per email + IP)
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            return response()->json(['message' => 'Invalid email or password.'], 401);
        }

        $request->session()->regenerate();

        $user = Auth::user();

        if (! in_array($user->role, ['admin', 'planner'], true)) {
            $this->endSession($request);

            return response()->json(['message' => 'This account does not have LGU access.'], 403);
        }

        return response()->json($this->userPayload($user));
    }

    // GET /api/lgu/me: who is signed in (lets the frontend restore state from the server, not the browser)
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['authenticated' => false]);
        }

        return response()->json(['authenticated' => true, ...$this->userPayload($user)]);
    }

    // POST /api/lgu/password
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', 'different:current_password', Password::min(10)->letters()->mixedCase()->numbers()],
        ]);

        $user = $request->user();
        $user->forceFill([
            'password' => Hash::make($validated['password']),
            'must_change_password' => false,
        ])->save();

        $request->session()->regenerate();

        return response()->json(['message' => 'Password changed.', ...$this->userPayload($user)]);
    }

    // POST /api/lgu/logout
    public function logout(Request $request): JsonResponse
    {
        $this->endSession($request);

        return response()->json(['message' => 'Logged out.']);
    }

    private function endSession(Request $request): void
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }

    /**
     * @return array{id: int, name: string, email: string, role: string, must_change_password: bool}
     */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'must_change_password' => (bool) $user->must_change_password,
        ];
    }
}
