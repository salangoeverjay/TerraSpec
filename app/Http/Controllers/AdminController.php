<?php

namespace App\Http\Controllers;

use App\Models\EnvironmentalRestriction;
use App\Models\SuitabilityCriteria;
use App\Models\TreeSpecies;
use App\Models\User;
use App\Models\ZoneUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

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
        $data = $request->validate([
            'unit_name'       => 'required|string|max:100',
            'unit_type'       => 'required|in:Urban,Rural',
            'total_area_ha'   => 'required|numeric|min:0',
            'settlement_tier' => 'required|in:CBD,Minor_Growth,Emerging,Satellite',
            'elevation_min'   => 'required|integer|min:0',
            'elevation_max'   => 'required|integer|min:0',
            'salinity_level'  => 'required|in:None,Low,Med,High',
        ]);
        $zone->update($data);
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
            '*.criteria_id'          => 'required|integer|exists:suitability_criteria,criteria_id',
            '*.commercial_weight'    => 'required|numeric|min:0|max:1',
            '*.residential_weight'   => 'required|numeric|min:0|max:1',
            '*.industrial_weight'    => 'required|numeric|min:0|max:1',
            '*.agricultural_weight'  => 'required|numeric|min:0|max:1',
            '*.reforestation_weight' => 'required|numeric|min:0|max:1',
        ]);

        foreach ($rows as $row) {
            SuitabilityCriteria::where('criteria_id', $row['criteria_id'])->update([
                'commercial_weight'    => $row['commercial_weight'],
                'residential_weight'   => $row['residential_weight'],
                'industrial_weight'    => $row['industrial_weight'],
                'agricultural_weight'  => $row['agricultural_weight'],
                'reforestation_weight' => $row['reforestation_weight'],
            ]);
        }

        return response()->json(['message' => 'All criteria weights saved.']);
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
            'description'      => 'nullable|string',
        ]);
        return response()->json(['message' => 'Restriction added.', 'data' => EnvironmentalRestriction::create($data)], 201);
    }

    public function updateRestriction(Request $request, int $id): JsonResponse
    {
        $r = EnvironmentalRestriction::findOrFail($id);
        $r->update($request->validate([
            'restriction_name' => 'required|string|max:100',
            'restriction_type' => 'required|string|max:50',
            'description'      => 'nullable|string',
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
    public function species(): JsonResponse
    {
        return response()->json(TreeSpecies::all());
    }

    public function storeSpecies(Request $request): JsonResponse
    {
        $data = $request->validate([
            'common_name'       => 'required|string|max:100',
            'scientific_name'   => 'required|string|max:150',
            'soil_preference'   => 'required|string|max:100',
            'elevation_range'   => 'required|string|max:50',
            'temperature_range' => 'required|string|max:50',
            'salinity_level'    => 'required|in:None,Low,Med,High',
            'suitability_notes' => 'nullable|string',
        ]);
        return response()->json(['message' => 'Species added.', 'data' => TreeSpecies::create($data)], 201);
    }

    public function updateSpecies(Request $request, int $id): JsonResponse
    {
        $s = TreeSpecies::findOrFail($id);
        $s->update($request->validate([
            'common_name'       => 'required|string|max:100',
            'scientific_name'   => 'required|string|max:150',
            'soil_preference'   => 'required|string|max:100',
            'elevation_range'   => 'required|string|max:50',
            'temperature_range' => 'required|string|max:50',
            'salinity_level'    => 'required|in:None,Low,Med,High',
            'suitability_notes' => 'nullable|string',
        ]));
        return response()->json(['message' => 'Species updated.', 'data' => $s]);
    }

    public function deleteSpecies(int $id): JsonResponse
    {
        TreeSpecies::findOrFail($id)->delete();
        return response()->json(['message' => 'Species deleted.']);
    }

    // ── USERS ────────────────────────────────────────────────────────
    public function users(): JsonResponse
    {
        return response()->json(
            User::select(['id', 'name', 'email', 'role', 'created_at'])->orderBy('name')->get()
        );
    }

    public function updateUser(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $data = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => ['required', 'email', Rule::unique('users')->ignore($id)],
            'role'  => 'required|in:admin,planner,viewer',
        ]);
        if ($request->filled('password')) {
            $data['password'] = bcrypt($request->input('password'));
        }
        $user->update($data);
        return response()->json(['message' => 'User updated.', 'data' => $user->only(['id', 'name', 'email', 'role'])]);
    }

    public function deleteUser(int $id): JsonResponse
    {
        User::findOrFail($id)->delete();
        return response()->json(['message' => 'User deleted.']);
    }
}
