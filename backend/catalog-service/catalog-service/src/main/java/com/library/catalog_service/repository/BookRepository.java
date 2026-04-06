package com.library.catalog_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.library.catalog_service.model.Book;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface BookRepository extends JpaRepository<Book, Long> {
    Page<Book> findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCase(String title, String author,
            Pageable pageable);
}
