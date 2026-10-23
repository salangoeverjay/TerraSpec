<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Creates the initial LGU accounts without any password in the source code.
 *
 * The initial password comes from TERRASPEC_ADMIN_PASSWORD / TERRASPEC_PLANNER_PASSWORD in .env;
 * when those are empty a random one is generated and printed once. Either way the account must
 * change its password at first login. Existing accounts are left untouched.
 */
class LguAdminSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            ['name' => 'CPDO Admin', 'email' => 'admin@panabocity.gov.ph', 'role' => 'admin', 'env' => 'TERRASPEC_ADMIN_PASSWORD'],
            ['name' => 'City Planner', 'email' => 'planner@panabocity.gov.ph', 'role' => 'planner', 'env' => 'TERRASPEC_PLANNER_PASSWORD'],
        ];

        foreach ($accounts as $account) {
            if (User::where('email', $account['email'])->exists()) {
                $this->command?->info("  {$account['email']} already exists, password unchanged.");

                continue;
            }

            $password = (string) env($account['env'], '');
            $generated = $password === '';
            if ($generated) {
                $password = Str::password(16);
            }

            User::create([
                'name' => $account['name'],
                'email' => $account['email'],
                'role' => $account['role'],
                'password' => Hash::make($password),
                'must_change_password' => true,
            ])->forceFill(['email_verified_at' => now()])->save();

            $this->command?->warn($generated
                ? "  {$account['email']} temporary password: {$password}  (shown once; must be changed at first login)"
                : "  {$account['email']} created with the password from {$account['env']} (must be changed at first login)");
        }
    }
}
