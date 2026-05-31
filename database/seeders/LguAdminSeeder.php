<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class LguAdminSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            [
                'name'     => 'CPDO Admin',
                'email'    => 'admin@panabocity.gov.ph',
                'role'     => 'admin',
                'password' => 'TerraSpec@2025',
            ],
            [
                'name'     => 'City Planner',
                'email'    => 'planner@panabocity.gov.ph',
                'role'     => 'planner',
                'password' => 'TerraSpec@2025',
            ],
        ];

        foreach ($accounts as $account) {
            User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name'     => $account['name'],
                    'role'     => $account['role'],
                    'password' => bcrypt($account['password']),
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}
