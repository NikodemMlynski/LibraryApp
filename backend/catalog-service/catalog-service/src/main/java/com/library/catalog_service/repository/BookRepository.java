package com.library.catalog_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.library.catalog_service.model.Book;
import org.springframework.stereotype.Repository;

@Repository
public interface BookRepository extends JpaRepository<Book, Long> {

}
