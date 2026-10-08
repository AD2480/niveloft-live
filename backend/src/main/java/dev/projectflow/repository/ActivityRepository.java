package dev.projectflow.repository;

import dev.projectflow.domain.Activity;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ActivityRepository extends JpaRepository<Activity, Long> {
    @EntityGraph(attributePaths = {"actor", "project"})
    Page<Activity> findByProjectIdOrderByCreatedAtDescIdDesc(Long projectId, Pageable pageable);

    @EntityGraph(attributePaths = {"actor", "project"})
    List<Activity> findByTaskIdOrderByCreatedAtDescIdDesc(Long taskId);

    @EntityGraph(attributePaths = {"actor", "project"})
    List<Activity> findTop12ByProjectIdInOrderByCreatedAtDescIdDesc(Collection<Long> projectIds);

    @Modifying
    @Query("update Activity a set a.taskId = null where a.taskId = :taskId")
    void detachTask(@Param("taskId") Long taskId);
}
