<?php

namespace Database\Seeders;

use App\Models\MangroveSpecies;
use Illuminate\Database\Seeder;

/**
 * Mangrove species of Davao del Norte, transcribed from Tables 30 (true mangroves) and 31
 * (mangrove associates), which cite Pototan et al. (2017), "Diversity of mangrove species in three
 * municipalities of Davao del Norte, Philippines". Names, families, IUCN status and habit are as printed.
 *
 * The tidal zone is the zone where each species is generally planted in Philippine mangrove
 * rehabilitation (general zonation, e.g. Primavera et al., 2004, Handbook of Mangroves in the
 * Philippines); it is not from the Pototan tables and must be confirmed for each site.
 */
class MangroveSpeciesSeeder extends Seeder
{
    private const SOURCE = 'Pototan et al. (2017), Diversity of mangrove species in three municipalities of Davao del Norte, Philippines';

    public function run(): void
    {
        MangroveSpecies::query()->delete();

        // [local name, scientific name, family, IUCN status, habit, tidal zone, zone note]
        $trueMangroves = [
            ['Nypa', 'Nypa fruticans', 'Arecaceae', 'Least concern', 'Palm', 'riverine', 'Brackish river banks with freshwater input; not on open saline flats.'],
            ['Miapi', 'Avicennia marina', 'Avicenniaceae', 'Least concern', 'Tree', 'seaward', 'Pioneer of exposed sandy-muddy fronts.'],
            ['Api-api', 'Avicennia rumphiana', 'Avicenniaceae', 'Vulnerable', 'Tree', 'seaward', 'Seaward to middle zone; threatened, so a conservation priority.'],
            ['Culasi', 'Lumnitzera racemosa', 'Combretaceae', 'Least concern', 'Tree', 'landward', 'Landward edge on firmer ground.'],
            ['Lipata', 'Excoecaria agallocha', 'Euphorbiaceae', 'Least concern', 'Tree', 'landward', 'Landward and back of the mangrove; milky sap is irritant.'],
            ['Pagatpat', 'Sonneratia alba', 'Lythraceae', 'Least concern', 'Tree', 'seaward', 'Pioneer of the seaward fringe, sandy to muddy substrate.'],
            ['Padada', 'Sonneratia caseolaris', 'Lythraceae', 'Least concern', 'Tree', 'riverine', 'Brackish river mouths with lower salinity.'],
            ['Piagao', 'Xylocarpus moluccensis', 'Meliaceae', 'Least concern', 'Tree', 'landward', 'Landward zone.'],
            ['Tabigi', 'Xylocarpus granatum', 'Meliaceae', 'Least concern', 'Tree', 'landward', 'Middle to landward zone, along creeks.'],
            ['Saging-saging', 'Aegiceras corniculatum', 'Primulaceae', 'Least concern', 'Shrub', 'riverine', 'Creek and river banks, middle to landward.'],
            ['Malatangal', 'Ceriops decandra', 'Rhizophoraceae', 'Near threatened', 'Tree', 'middle', 'Middle to landward zone; near threatened, so a conservation priority.'],
            ['Bakauan lalake', 'Rhizophora apiculata', 'Rhizophoraceae', 'Least concern', 'Tree', 'middle', 'Deep soft mud in the middle zone. Do not plant on exposed seaward fronts.'],
            ['Bakauan babae', 'Rhizophora mucronata', 'Rhizophoraceae', 'Least concern', 'Tree', 'middle', 'Deep soft mud in the middle zone and creek banks. Do not plant on exposed seaward fronts.'],
        ];

        $associates = [
            ['Malubago', 'Hibiscus tiliaceus', 'Malvaceae', 'Not assessed', 'Tree', 'back_mangrove', 'Back mangrove and estuary margins.'],
            ['Talisay', 'Terminalia catappa', 'Combretaceae', 'Least concern', 'Tree', 'back_mangrove', 'Beach margin above high tide.'],
            ['Apatot (Noni)', 'Morinda citrifolia', 'Rubiaceae', 'Least concern', 'Tree', 'back_mangrove', 'Back mangrove and coastal margin.'],
            ['Mangrove trumpet tree', 'Dolichandrone spathacea', 'Bignoniaceae', 'Least concern', 'Tree', 'back_mangrove', 'Landward edge of mangroves and tidal river banks.'],
            ['Dungon-late', 'Heritiera littoralis', 'Malvaceae', 'Least concern', 'Tree', 'back_mangrove', 'Landward edge, rarely flooded ground.'],
        ];

        $order = 1;
        foreach ([['true_mangrove', $trueMangroves], ['associate', $associates]] as [$category, $rows]) {
            foreach ($rows as [$local, $scientific, $family, $iucn, $habit, $zone, $note]) {
                MangroveSpecies::create([
                    'list_order' => $order++,
                    'local_name' => $local,
                    'scientific_name' => $scientific,
                    'family' => $family,
                    'category' => $category,
                    'iucn_status' => $iucn,
                    'habit' => $habit,
                    'tidal_zone' => $zone,
                    'zone_note' => $note,
                    'source' => self::SOURCE,
                ]);
            }
        }
    }
}
