<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->foreignId('academic_session_id')->nullable()->after('school_id')->constrained('academic_sessions')->nullOnDelete();
            $table->foreignId('class_id')->nullable()->after('date_of_birth')->constrained('classes')->nullOnDelete();
            $table->foreignId('section_id')->nullable()->after('class_id')->constrained('sections')->nullOnDelete();
            $table->string('middle_name')->nullable()->after('first_name');
            $table->string('admission_type')->default('regular')->after('admission_no');
            $table->string('house')->nullable()->after('roll_no');
            $table->string('category')->nullable()->after('house');
            $table->string('religion')->nullable()->after('category');
            $table->string('blood_group')->nullable()->after('religion');
            $table->string('nationality')->nullable()->after('blood_group');
            $table->string('mother_tongue')->nullable()->after('nationality');
            $table->string('photo_path')->nullable()->after('mother_tongue');
            $table->string('primary_phone')->nullable()->after('photo_path');
            $table->string('primary_email')->nullable()->after('primary_phone');
            $table->text('current_address')->nullable()->after('primary_email');
            $table->text('permanent_address')->nullable()->after('current_address');
            $table->string('city')->nullable()->after('permanent_address');
            $table->string('state')->nullable()->after('city');
            $table->string('postal_code')->nullable()->after('state');
            $table->string('country')->nullable()->after('postal_code');
            $table->string('emergency_contact_name')->nullable()->after('guardian_phone');
            $table->string('emergency_contact_relation')->nullable()->after('emergency_contact_name');
            $table->string('emergency_contact_phone')->nullable()->after('emergency_contact_relation');
            $table->string('medical_conditions')->nullable()->after('emergency_contact_phone');
            $table->string('allergies')->nullable()->after('medical_conditions');
            $table->string('medications')->nullable()->after('allergies');
            $table->string('doctor_name')->nullable()->after('medications');
            $table->string('doctor_phone')->nullable()->after('doctor_name');
            $table->string('previous_school_name')->nullable()->after('doctor_phone');
            $table->string('previous_school_board')->nullable()->after('previous_school_name');
            $table->string('previous_school_class')->nullable()->after('previous_school_board');
            $table->string('previous_school_transfer_certificate_no')->nullable()->after('previous_school_class');
            $table->date('transfer_date')->nullable()->after('admission_date');
            $table->string('transfer_reason')->nullable()->after('transfer_date');

            $table->index(['school_id', 'class_id']);
            $table->index(['school_id', 'section_id']);
            $table->index(['school_id', 'status']);
            $table->index(['school_id', 'category']);
            $table->unique(
                ['school_id', 'academic_session_id', 'class_id', 'section_id', 'roll_no'],
                'students_roll_unique_per_class_section_session',
            );
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropUnique('students_roll_unique_per_class_section_session');
            $table->dropIndex(['school_id', 'class_id']);
            $table->dropIndex(['school_id', 'section_id']);
            $table->dropIndex(['school_id', 'status']);
            $table->dropIndex(['school_id', 'category']);
            $table->dropConstrainedForeignId('academic_session_id');
            $table->dropConstrainedForeignId('class_id');
            $table->dropConstrainedForeignId('section_id');
            $table->dropColumn([
                'middle_name',
                'admission_type',
                'house',
                'category',
                'religion',
                'blood_group',
                'nationality',
                'mother_tongue',
                'photo_path',
                'primary_phone',
                'primary_email',
                'current_address',
                'permanent_address',
                'city',
                'state',
                'postal_code',
                'country',
                'emergency_contact_name',
                'emergency_contact_relation',
                'emergency_contact_phone',
                'medical_conditions',
                'allergies',
                'medications',
                'doctor_name',
                'doctor_phone',
                'previous_school_name',
                'previous_school_board',
                'previous_school_class',
                'previous_school_transfer_certificate_no',
                'transfer_date',
                'transfer_reason',
            ]);
        });
    }
};
