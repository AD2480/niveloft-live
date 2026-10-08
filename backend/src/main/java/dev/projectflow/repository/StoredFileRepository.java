package dev.projectflow.repository;

import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import dev.projectflow.domain.StoredFile;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoredFileRepository extends JpaRepository<StoredFile, Long> {

    List<StoredFile> findByProjectId(Long projectId);

    /** Bytes of evidence stored for a project (for its storage quota). */
    @Query("select coalesce(sum(f.sizeBytes), 0) from StoredFile f where f.project.id = :projectId")
    long sumSizeByProjectId(@Param("projectId") Long projectId);
}
