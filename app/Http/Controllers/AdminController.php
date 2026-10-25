<?php

namespace App\Http\Controllers;

use App\Models\EnvironmentalRestriction;
use App\Models\MangroveSpecies;
use App\Models\SuitabilityCriteria;
use App\Models\User;
use App\Models\ZoneUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    // ── ZONES ────────────────────────────────────────────────────────
    public function zones(): JsonResponse
    {
        return response()->json(
            ZoneUnit::select([
                'zone_unit_id', 'unit_name', 'unit_type', 'total_area_ha',
                'settlement_tier', 'dominant_soil_type', 'dominant_slope_class',
                'land_capability_class', 'elevation_min', 'elevation_max', 'salinity_level',
            ])->orderBy('unit_name')->get()
        );
    }

    public function updateZone(Request $request, int $id): JsonResponse
    {
        $zone = ZoneUnit::findOrFail($id);
        // The barangay name is not editable: the map boundaries, seeders and reports all match on it
        $data = $request->validate([
            'unit_name' => ['sometimes', Rule::in([$zone->unit_name])],
            'unit_type' => 'required|in:Urban,Rural',
            'total_area_ha' => 'required|numeric|min:0',
            'settlement_tier' => 'required|in:CBD,Minor_Growth,Emerging,Satellite',
            'elevation_min' => 'required|integer|min:0',
            'elevation_max' => 'required|integer|min:0',
            'salinity_level' => 'required|in:None,Low,Med,High',
        ], [
            'unit_name.in' => 'The barangay name cannot be changed.',
        ]);
        $zone->update(collect($data)->except('unit_name')->all());

        return response()->json(['message' => 'Zone updated.', 'data' => $zone]);
    }

    // ── CRITERIA ─────────────────────────────────────────────────────
    public function criteria(): JsonResponse
    {
        return response()->json(SuitabilityCriteria::all());
    }

    public function updateAllCriteria(Request $request): JsonResponse
    {
        $rows = $request->validate([
            '*.criteria_id' => 'required|integer|exists:suitability_criteria,criteria_id',
            '*.commercial_weight' => 'required|numeric|min:0|max:1',
            '*.residential_weight' => 'required|numeric|min:0|max:1',
            '*.industrial_weight' => 'required|numeric|min:0|max:1',
            '*.agricultural_weight' => 'required|numeric|min:0|max:1',
            '*.reforestation_weight' => 'required|numeric|min:0|max:1',
        ]);

        $this->ensureCompleteWeightColumns($rows);

        // All weights change together or not at all
        DB::transaction(function () use ($rows) {
            foreach ($rows as $row) {
                SuitabilityCriteria::where('criteria_id', $row['criteria_id'])->update([
                    'commercial_weight' => $row['commercial_weight'],
                    'residential_weight' => $row['residential_weight'],
                    'industrial_weight' => $row['industrial_weight'],
                    'agricultural_weight' => $row['agricultural_weight'],
                    'reforestation_weight' => $row['reforestation_weight'],
                ]);
            }
        });

        return response()->json(['message' => 'All criteria weights saved.']);
    }

    /**
     * AHP-WLC needs every criterion listed once and each land use's weights to sum to 1.
     *
     * @param  array<int, array<string, mixed>>  $rows
     *
     * @throws ValidationException
     */
    private function ensureCompleteWeightColumns(array $rows): void
    {
        $ids = array_column($rows, 'criteria_id');
        if (count($ids) !== count(array_unique($ids)) || count($ids) !== SuitabilityCriteria::count()) {
            throw ValidationException::withMessages([
                'criteria' => 'Send the weights of every criterion exactly once.',
            ]);
        }

        $errors = [];
        foreach (['commercial', 'residential', 'industrial', 'agricultural', 'reforestation'] as $type) {
            $sum = array_sum(array_column($rows, "{$type}_weight"));
            if (abs($sum - 1) > 0.001) {
                $errors["{$type}_weight"] = sprintf('The %s weights must add up to 1 (they add up to %.3f).', $type, $sum);
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    // ── RESTRICTIONS ─────────────────────────────────────────────────
    public function restrictions(): JsonResponse
    {
        return response()->json(EnvironmentalRestriction::all());
    }

    public function storeRestriction(Request $request): JsonResponse
    {
        $data = $request->validate([
            'restriction_name' => 'required|string|max:100',
            'restriction_type' => 'required|string|max:50',
            'description' => 'nullable|string',
        ]);

        return response()->json(['message' => 'Restriction added.', 'data' => EnvironmentalRestriction::create($data)], 201);
    }

    public function updateRestriction(Request $request, int $id): JsonResponse
    {
        $r = EnvironmentalRestriction::findOrFail($id);
        $r->update($request->validate([
            'restriction_name' => 'required|string|max:100',
            'restriction_type' => 'required|string|max:50',
            'description' => 'nullable|string',
        ]));

        return response()->json(['message' => 'Restriction updated.', 'data' => $r]);
    }

    public function deleteRestriction(int $id): JsonResponse
    {
        EnvironmentalRestriction::findOrFail($id);
        DB::table('zone_restrictions')->where('restriction_id', $id)->delete();
        EnvironmentalRestriction::destroy($id);

        return response()->json(['message' => 'Restriction deleted.']);
    }

    // ── SPECIES ──────────────────────────────────────────────────────
    // Mangrove species (true mangroves and associates) recommended by tidal zone
    public function species(): JsonResponse
    {
        return response()->json(MangroveSpecies::orderBy('list_order')->get());
    }

    public function storeSpecies(Request $request): JsonResponse
    {
        $data = $this->validateSpecies($request);
        $data['list_order'] = (int) MangroveSpecies::max('list_order') + 1;

        return response()->json(['message' => 'Species added.', 'data' => MangroveSpecies::create($data)], 201);
    }

    public function updateSpecies(Request $request, int $id): JsonResponse
    {
        $species = MangroveSpecies::findOrFail($id);
        $species->update($this->validateSpecies($request, $species));

        return response()->json(['message' => 'Species updated.', 'data' => $species]);
    }

    public function deleteSpecies(int $id): JsonResponse
    {
        MangroveSpecies::findOrFail($id)->delete();

        return response()->json(['message' => 'Species deleted.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateSpecies(Request $request, ?MangroveSpecies $species = null): array
    {
        return $request->validate([
            'local_name' => 'required|string|max:100',
            'scientific_name' => ['required', 'string', 'max:150', Rule::unique('mangrove_species', 'scientific_name')->ignore($species?->id)],
            'family' => 'required|string|max:100',
            'category' => ['required', Rule::in(array_keys(MangroveSpecies::CATEGORIES))],
            'iucn_status' => 'required|string|max:50',
            'habit' => 'required|string|max:50',
            'tidal_zone' => ['required', Rule::in(array_keys(MangroveSpecies::TIDAL_ZONES))],
            'zone_note' => 'nullable|string',
            'source' => 'required|string|max:255',
        ]);
    }

    // ── USERS ────────────────────────────────────────────────────────
    public function users(): JsonResponse
    {
        return response()->json(
            User::select(['id', 'name', 'email', 'role', 'must_change_password', 'created_at'])->orderBy('name')->get()
        );
    }

    // POST /api/admin/users (admin only). The account starts with a temporary password that must
    // be changed at first login; when none is given a random one is generated and returned once.
    public function storeUser(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'role' => 'required|in:admin,planner,viewer',
            'password' => ['nullable', 'string', Password::min(10)->letters()->mixedCase()->numbers()],
        ]);

        $generated = empty($data['password']);
        $temporaryPassword = $generated ? Str::password(14) : $data['password'];

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'password' => Hash::make($temporaryPassword),
            'must_change_password' => true,
        ]);

        return response()->json([
            'message' => 'User created. They must change the temporary password at first login.',
            'data' => $user->only(['id', 'name', 'email', 'role']),
            'temporary_password' => $generated ? $temporaryPassword : null,
        ], 201);
    }

    public function updateUser(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', Rule::unique('users')->ignore($id)],
            'role' => 'required|in:admin,planner,viewer',
            'password' => ['nullable', 'string', Password::min(10)->letters()->mixedCase()->numbers()],
        ]);

        if ($user->role === 'admin' && $data['role'] !== 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json(['message' => 'At least one administrator account must remain.'], 422);
        }

        if (! empty($data['password'])) {
            // An admin-set password is temporary: the user must choose their own at next login
            $data['password'] = Hash::make($data['password']);
            $data['must_change_password'] = $user->id !== $request->user()->id;
        } else {
            unset($data['password']);
        }

        $user->update($data);

        return response()->json(['message' => 'User updated.', 'data' => $user->only(['id', 'name', 'email', 'role'])]);
    }

    public function deleteUser(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        if ($user->role === 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json(['message' => 'At least one administrator account must remain.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }
}
