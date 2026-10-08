package dev.projectflow.service;

import java.util.List;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronization;
import dev.projectflow.config.AppProperties;
import dev.projectflow.domain.Project;
import dev.projectflow.domain.StoredFile;
import dev.projectflow.domain.User;
import dev.projectflow.repository.StoredFileRepository;
import dev.projectflow.web.error.ApiException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Stores evidence files on local disk under random keys (never the user's file name),
 * outside any web root. Access is checked by the caller before {@link #open}.
 */
@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);
    public static final long MAX_BYTES = 10L * 1024 * 1024;
    /** Only these types are shown inline (image previews); everything else downloads. */
    public static final Set<String> INLINE_TYPES = Set.of("image/png", "image/jpeg", "image/gif", "image/webp");

    private final Path root;
    private final StoredFileRepository files;
    private final Clock clock;

    public FileStorageService(AppProperties props, StoredFileRepository files, Clock clock) throws IOException {
        this.root = Path.of(props.storage().directory()).toAbsolutePath().normalize();
        Files.createDirectories(root);
        this.files = files;
        this.clock = clock;
    }

    public StoredFile store(MultipartFile upload, Project project, User uploader) {
        if (upload.isEmpty()) throw ApiException.validation("files", "Empty files can't be attached.");
        if (upload.getSize() > MAX_BYTES) throw ApiException.validation("files", "Each file must be 10 MB or smaller.");
        String key = UUID.randomUUID().toString();
        Path target = root.resolve(key);
        try (InputStream in = upload.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Could not store uploaded file", e);
        }
        // If the submission fails after this (validation, a conflict, a timeout), don't leave the file behind.
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) deleteKeys(List.of(key));
                }
            });
        }
        StoredFile f = new StoredFile();
        f.setProject(project);
        f.setOriginalName(cleanName(upload.getOriginalFilename()));
        f.setContentType(upload.getContentType() == null || upload.getContentType().isBlank() ? "application/octet-stream" : upload.getContentType());
        f.setSizeBytes(upload.getSize());
        f.setStorageKey(key);
        f.setUploadedBy(uploader);
        f.setCreatedAt(Instant.now(clock));
        return files.save(f);
    }

    public Resource open(StoredFile f) {
        Path path = root.resolve(f.getStorageKey()).normalize();
        if (!path.startsWith(root) || !Files.exists(path)) throw ApiException.notFound("The file is no longer available.");
        return new PathResource(path);
    }

    /** Remove stored bytes (after their rows were deleted). Failures are logged, not fatal. */
    public void deleteKeys(Collection<String> keys) {
        for (String key : keys) {
            try {
                Files.deleteIfExists(root.resolve(key).normalize());
            } catch (IOException e) {
                log.warn("Could not delete stored file {}: {}", key, e.getMessage());
            }
        }
    }

    private static String cleanName(String name) {
        if (name == null || name.isBlank()) return "file";
        String base = name.replace('\\', '/');
        base = base.substring(base.lastIndexOf('/') + 1).replaceAll("[\\r\\n\"]", "_");
        return base.length() > 255 ? base.substring(base.length() - 255) : base;
    }
}
