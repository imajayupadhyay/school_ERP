<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            // Contact
            $table->string('alternate_phone')->nullable()->after('phone');
            $table->string('website')->nullable()->after('email');

            // Address
            $table->string('address_line2')->nullable()->after('address');
            $table->string('state')->nullable()->after('city');
            $table->string('postal_code')->nullable()->after('state');
            $table->string('country')->default('India')->after('postal_code');

            // Localization & academic year
            $table->string('timezone')->default('Asia/Kolkata')->after('country');
            $table->string('date_format')->default('d-m-Y')->after('timezone');
            $table->string('currency')->default('INR')->after('date_format');
            $table->unsignedTinyInteger('academic_year_start_month')->default(4)->after('currency');

            // Identifiers
            $table->string('board_affiliation')->nullable()->after('academic_year_start_month');
            $table->string('registration_number')->nullable()->after('board_affiliation');
            $table->string('udise_code')->nullable()->after('registration_number');
            $table->string('principal_name')->nullable()->after('udise_code');
            $table->unsignedSmallInteger('established_year')->nullable()->after('principal_name');
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn([
                'alternate_phone',
                'website',
                'address_line2',
                'state',
                'postal_code',
                'country',
                'timezone',
                'date_format',
                'currency',
                'academic_year_start_month',
                'board_affiliation',
                'registration_number',
                'udise_code',
                'principal_name',
                'established_year',
            ]);
        });
    }
};
