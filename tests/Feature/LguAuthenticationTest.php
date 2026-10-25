<?php

use App\Models\User;
use Database\Seeders\LguAdminSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    // CSRF is covered by the framework; these tests focus on authentication and roles
    $this->withoutMiddleware(ValidateCsrfToken::class);
});

it('rejects admin API requests without a login', function (string $method, string $uri) {
    $this->json($method, $uri)->assertUnauthorized();
})->with([
    ['GET', '/api/admin/users'],
    ['PUT', '/api/admin/users/1'],
    ['DELETE', '/api/admin/users/1'],
    ['GET', '/api/admin/zones'],
    ['PUT', '/api/admin/criteria'],
    ['POST', '/api/admin/ahp/apply'],
    ['POST', '/api/admin/species'],
]);

it('logs in with valid credentials and keeps the session', function () {
    $admin = User::factory()->admin()->create();

    $this->postJson('/api/lgu/login', ['email' => $admin->email, 'password' => 'password'])
        ->assertOk()
        ->assertJson(['email' => $admin->email, 'role' => 'admin', 'must_change_password' => false]);

    $this->getJson('/api/lgu/me')->assertJson(['authenticated' => true, 'email' => $admin->email]);
    $this->getJson('/api/admin/users')->assertOk();
});

it('rejects a wrong password', function () {
    $admin = User::factory()->admin()->create();

    $this->postJson('/api/lgu/login', ['email' => $admin->email, 'password' => 'wrong-password'])
        ->assertUnauthorized();

    $this->getJson('/api/lgu/me')->assertJson(['authenticated' => false]);
});

it('blocks login after five failed attempts', function () {
    $admin = User::factory()->admin()->create();

    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/lgu/login', ['email' => $admin->email, 'password' => 'wrong'])->assertUnauthorized();
    }

    $this->postJson('/api/lgu/login', ['email' => $admin->email, 'password' => 'password'])->assertStatus(429);
});

it('refuses LGU login for viewer accounts', function () {
    $viewer = User::factory()->create(['role' => 'viewer']);

    $this->postJson('/api/lgu/login', ['email' => $viewer->email, 'password' => 'password'])->assertForbidden();
    $this->getJson('/api/lgu/me')->assertJson(['authenticated' => false]);
});

it('lets planners manage data but not user accounts', function () {
    $planner = User::factory()->planner()->create();

    $this->actingAs($planner)->getJson('/api/admin/zones')->assertOk();
    $this->actingAs($planner)->getJson('/api/admin/users')->assertForbidden();
});

it('blocks LGU access until a temporary password is changed', function () {
    $admin = User::factory()->admin()->mustChangePassword()->create();

    $this->actingAs($admin)->getJson('/api/admin/zones')->assertForbidden();

    $this->actingAs($admin)->postJson('/api/lgu/password', [
        'current_password' => 'password',
        'password' => 'NewSecret123',
        'password_confirmation' => 'NewSecret123',
    ])->assertOk()->assertJson(['must_change_password' => false]);

    expect(Hash::check('NewSecret123', $admin->fresh()->password))->toBeTrue();
    $this->actingAs($admin->fresh())->getJson('/api/admin/zones')->assertOk();
});

it('rejects weak new passwords', function () {
    $admin = User::factory()->admin()->mustChangePassword()->create();

    $this->actingAs($admin)->postJson('/api/lgu/password', [
        'current_password' => 'password',
        'password' => 'short',
        'password_confirmation' => 'short',
    ])->assertUnprocessable()->assertJsonValidationErrors('password');
});

it('forces a password change when an admin resets another user', function () {
    $admin = User::factory()->admin()->create();
    $planner = User::factory()->planner()->create();

    $this->actingAs($admin)->putJson("/api/admin/users/{$planner->id}", [
        'name' => $planner->name, 'email' => $planner->email, 'role' => 'planner', 'password' => 'TempPass1234',
    ])->assertOk();

    expect($planner->fresh()->must_change_password)->toBeTrue();
});

it('lets an admin create a user with a generated temporary password', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->postJson('/api/admin/users', [
        'name' => 'New Planner', 'email' => 'new.planner@panabocity.gov.ph', 'role' => 'planner',
    ])->assertCreated();

    $password = $response->json('temporary_password');
    $user = User::where('email', 'new.planner@panabocity.gov.ph')->firstOrFail();

    expect($password)->toBeString()->toHaveLength(14)
        ->and($user->role)->toBe('planner')
        ->and($user->must_change_password)->toBeTrue()
        ->and(Hash::check($password, $user->password))->toBeTrue();
});

it('creates a user with an admin-chosen temporary password without returning it', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->postJson('/api/admin/users', [
        'name' => 'New Admin', 'email' => 'second.admin@panabocity.gov.ph', 'role' => 'admin', 'password' => 'TempPass1234',
    ])->assertCreated()->assertJsonPath('temporary_password', null);

    $user = User::where('email', 'second.admin@panabocity.gov.ph')->firstOrFail();
    expect(Hash::check('TempPass1234', $user->password))->toBeTrue()
        ->and($user->must_change_password)->toBeTrue();
});

it('validates new user accounts', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->postJson('/api/admin/users', [
        'name' => 'Dup', 'email' => $admin->email, 'role' => 'superuser', 'password' => 'weak',
    ])->assertUnprocessable()->assertJsonValidationErrors(['email', 'role', 'password']);
});

it('does not let planners or guests create users', function () {
    $planner = User::factory()->planner()->create();
    $payload = ['name' => 'X', 'email' => 'x@panabocity.gov.ph', 'role' => 'admin'];

    $this->postJson('/api/admin/users', $payload)->assertUnauthorized();
    $this->actingAs($planner)->postJson('/api/admin/users', $payload)->assertForbidden();
    expect(User::where('email', 'x@panabocity.gov.ph')->exists())->toBeFalse();
});

it('protects against deleting yourself or the last administrator', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->deleteJson("/api/admin/users/{$admin->id}")->assertUnprocessable();
    $this->actingAs($admin)->putJson("/api/admin/users/{$admin->id}", [
        'name' => $admin->name, 'email' => $admin->email, 'role' => 'planner',
    ])->assertUnprocessable();
});

it('seeds LGU accounts without a hard-coded password', function () {
    $this->seed(LguAdminSeeder::class);

    $admin = User::where('email', 'admin@panabocity.gov.ph')->firstOrFail();

    expect($admin->must_change_password)->toBeTrue()
        ->and(Hash::check('TerraSpec@2025', $admin->password))->toBeFalse();
});

it('ends the session on logout', function () {
    $admin = User::factory()->admin()->create();
    $this->postJson('/api/lgu/login', ['email' => $admin->email, 'password' => 'password'])->assertOk();

    $this->postJson('/api/lgu/logout')->assertOk();

    $this->getJson('/api/lgu/me')->assertJson(['authenticated' => false]);
});
