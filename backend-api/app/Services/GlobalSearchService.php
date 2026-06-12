<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Guardian;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Tenant- and permission-scoped global search for the admin topbar.
 *
 * Each category is only searched when the user can view that module
 * (`<module>.view`), and every query rides the `BelongsToSchool` global scope,
 * so results never leak across schools. Returns a list of result groups, each
 * limited to a handful of matches with a deep-link URL into the module.
 */
class GlobalSearchService
{
    private const PER_GROUP = 6;

    /**
     * @return array{groups: array<int, array<string, mixed>>, total: int}
     */
    public function search(User $user, string $term): array
    {
        $term = trim($term);
        $groups = [];

        if (mb_strlen($term) < 2) {
            return ['groups' => [], 'total' => 0];
        }

        if ($user->hasPermission('students.view')) {
            $groups[] = $this->group('students', 'Students', $this->students($term));
        }
        if ($user->hasPermission('employees.view')) {
            $groups[] = $this->group('employees', 'Teachers & Staff', $this->employees($term));
        }
        if ($user->hasPermission('guardians.view')) {
            $groups[] = $this->group('guardians', 'Parents & Guardians', $this->guardians($term));
        }
        if ($user->hasPermission('academic.view')) {
            $groups[] = $this->group('classes', 'Classes', $this->classes($term));
        }

        $groups = array_values(array_filter($groups, fn (array $g) => $g['items'] !== []));
        $total = array_sum(array_map(fn (array $g) => count($g['items']), $groups));

        return ['groups' => $groups, 'total' => $total];
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<string, mixed>
     */
    private function group(string $type, string $label, array $items): array
    {
        return ['type' => $type, 'label' => $label, 'items' => $items];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function students(string $term): array
    {
        $like = "%{$term}%";

        return Student::query()
            ->where('status', '!=', 'archived')
            ->where(function (Builder $q) use ($like, $term) {
                $q->where('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('admission_no', 'like', $like)
                    ->orWhereRaw("CONCAT(first_name, ' ', COALESCE(last_name, '')) like ?", [$like])
                    ->orWhere('roll_no', $term);
            })
            ->orderBy('first_name')
            ->limit(self::PER_GROUP)
            ->get()
            ->map(function (Student $s) {
                $name = trim($s->first_name.' '.($s->last_name ?? ''));
                $scope = trim(($s->class_name ?? '').' '.($s->section ?? ''));
                $sub = array_filter([$s->admission_no ? "Adm {$s->admission_no}" : null, $scope ?: null]);

                return [
                    'id' => $s->id,
                    'label' => $name,
                    'sublabel' => implode(' · ', $sub),
                    'url' => '/admin/students?q='.rawurlencode($s->admission_no ?: $name),
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function employees(string $term): array
    {
        $like = "%{$term}%";

        return Employee::query()
            ->where(function (Builder $q) use ($like) {
                $q->where('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('employee_code', 'like', $like)
                    ->orWhereRaw("CONCAT(first_name, ' ', COALESCE(last_name, '')) like ?", [$like]);
            })
            ->orderBy('first_name')
            ->limit(self::PER_GROUP)
            ->get()
            ->map(function (Employee $e) {
                $sub = array_filter([$e->designation ?: ucfirst(str_replace('_', ' ', $e->employee_type)), $e->employee_code]);

                return [
                    'id' => $e->id,
                    'label' => $e->full_name,
                    'sublabel' => implode(' · ', $sub),
                    'url' => '/admin/employees?q='.rawurlencode($e->employee_code ?: $e->full_name),
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function guardians(string $term): array
    {
        $like = "%{$term}%";

        return Guardian::query()
            ->where('status', '!=', 'archived')
            ->where(function (Builder $q) use ($like) {
                $q->where('name', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhere('email', 'like', $like);
            })
            ->orderBy('name')
            ->limit(self::PER_GROUP)
            ->get()
            ->map(fn (Guardian $g) => [
                'id' => $g->id,
                'label' => $g->name,
                'sublabel' => implode(' · ', array_filter([$g->relation, $g->phone])),
                'url' => '/admin/guardians?q='.rawurlencode($g->name),
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function classes(string $term): array
    {
        return SchoolClass::query()
            ->where('name', 'like', "%{$term}%")
            ->withCount('sections')
            ->orderBy('sequence')
            ->limit(self::PER_GROUP)
            ->get()
            ->map(fn (SchoolClass $c) => [
                'id' => $c->id,
                'label' => $c->name,
                'sublabel' => $c->sections_count.' '.($c->sections_count === 1 ? 'section' : 'sections'),
                'url' => '/admin/academic-setup',
            ])
            ->all();
    }
}
