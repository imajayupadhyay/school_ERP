<?php

namespace Database\Seeders;

use App\Services\Access\AccessProvisioner;
use Illuminate\Database\Seeder;

/** Seeds the global permission catalog from config/permissions.php. */
class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(AccessProvisioner::class)->syncCatalog();
    }
}
